import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Create pool only when needed
function getPool() {
  if (!process.env.DATABASE_URL) {
    return null;
  }
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
  });
}

export async function POST(request: NextRequest) {
  const pool = getPool();
  if (!pool) {
    return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { userId, action, cancelReason, extensionDays } = await request.json();

    if (!userId || !action) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get current billing account
      const accountResult = await client.query(
        'SELECT * FROM billing_accounts WHERE user_id = $1',
        [userId]
      );

      let billingAccount = accountResult.rows[0];
      const now = new Date();
      const nextMonth = new Date(now);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      switch (action) {
        case 'activate': {
          if (billingAccount) {
            // Update existing account
            await client.query(`
              UPDATE billing_accounts 
              SET subscription_status = 'active',
                  subscription_plan = 'premium_monthly',
                  credits_monthly_allowance = 50,
                  credits_reset_at = $2,
                  updated_at = NOW()
              WHERE user_id = $1
            `, [userId, nextMonth.toISOString()]);

            // Add initial credits
            await client.query(`
              UPDATE billing_accounts 
              SET credits_balance = credits_balance + 50
              WHERE user_id = $1
            `, [userId]);

            // Get updated balance
            const balanceResult = await client.query(
              'SELECT credits_balance FROM billing_accounts WHERE user_id = $1',
              [userId]
            );

            // Log transaction
            await client.query(`
              INSERT INTO credit_ledger (billing_account_id, user_id, change_amount, change_type, balance_after, description)
              VALUES ($1, $2, 50, 'subscription', $3, 'Subscription activated - Monthly allowance')
            `, [billingAccount.id, userId, balanceResult.rows[0].credits_balance]);

          } else {
            // Create new billing account
            const newAccountResult = await client.query(`
              INSERT INTO billing_accounts (user_id, subscription_status, subscription_plan, credits_balance, credits_monthly_allowance, credits_reset_at)
              VALUES ($1, 'active', 'premium_monthly', 50, 50, $2)
              RETURNING id, credits_balance
            `, [userId, nextMonth.toISOString()]);

            // Log transaction
            await client.query(`
              INSERT INTO credit_ledger (billing_account_id, user_id, change_amount, change_type, balance_after, description)
              VALUES ($1, $2, 50, 'subscription', 50, 'Subscription activated - Initial credits')
            `, [newAccountResult.rows[0].id, userId]);
          }

          await client.query('COMMIT');
          return NextResponse.json({ 
            success: true, 
            message: 'Subscription activated successfully! $12/month plan started.' 
          });
        }

        case 'pause': {
          if (!billingAccount) {
            await client.query('ROLLBACK');
            return NextResponse.json({ success: false, error: 'No billing account found' }, { status: 404 });
          }

          await client.query(`
            UPDATE billing_accounts 
            SET subscription_status = 'paused', updated_at = NOW()
            WHERE user_id = $1
          `, [userId]);

          await client.query('COMMIT');
          return NextResponse.json({ 
            success: true, 
            message: 'Subscription paused. Billing is on hold.' 
          });
        }

        case 'resume': {
          if (!billingAccount) {
            await client.query('ROLLBACK');
            return NextResponse.json({ success: false, error: 'No billing account found' }, { status: 404 });
          }

          await client.query(`
            UPDATE billing_accounts 
            SET subscription_status = 'active', 
                credits_reset_at = $2,
                updated_at = NOW()
            WHERE user_id = $1
          `, [userId, nextMonth.toISOString()]);

          await client.query('COMMIT');
          return NextResponse.json({ 
            success: true, 
            message: 'Subscription resumed successfully!' 
          });
        }

        case 'cancel': {
          if (!billingAccount) {
            await client.query('ROLLBACK');
            return NextResponse.json({ success: false, error: 'No billing account found' }, { status: 404 });
          }

          await client.query(`
            UPDATE billing_accounts 
            SET subscription_status = 'cancelled', 
                subscription_plan = NULL,
                updated_at = NOW()
            WHERE user_id = $1
          `, [userId]);

          // Log cancellation reason if provided
          if (cancelReason) {
            await client.query(`
              INSERT INTO credit_ledger (billing_account_id, user_id, change_amount, change_type, balance_after, description)
              VALUES ($1, $2, 0, 'admin', $3, $4)
            `, [billingAccount.id, userId, billingAccount.credits_balance, `Subscription cancelled: ${cancelReason}`]);
          }

          await client.query('COMMIT');
          return NextResponse.json({ 
            success: true, 
            message: 'Subscription cancelled. Access continues until current period ends.' 
          });
        }

        case 'extend': {
          if (!billingAccount) {
            await client.query('ROLLBACK');
            return NextResponse.json({ success: false, error: 'No billing account found' }, { status: 404 });
          }

          const days = parseInt(extensionDays) || 30;
          const currentReset = billingAccount.credits_reset_at ? new Date(billingAccount.credits_reset_at) : new Date();
          const newResetDate = new Date(currentReset);
          newResetDate.setDate(newResetDate.getDate() + days);

          await client.query(`
            UPDATE billing_accounts 
            SET credits_reset_at = $2, updated_at = NOW()
            WHERE user_id = $1
          `, [userId, newResetDate.toISOString()]);

          // Log extension
          await client.query(`
            INSERT INTO credit_ledger (billing_account_id, user_id, change_amount, change_type, balance_after, description)
            VALUES ($1, $2, 0, 'admin', $3, $4)
          `, [billingAccount.id, userId, billingAccount.credits_balance, `Billing extended by ${days} days`]);

          await client.query('COMMIT');
          return NextResponse.json({ 
            success: true, 
            message: `Billing date extended by ${days} days to ${newResetDate.toLocaleDateString()}.` 
          });
        }

        default:
          await client.query('ROLLBACK');
          return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
      }

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Subscription API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to process subscription action' 
    }, { status: 500 });
  }
}

// GET endpoint to fetch subscription details
export async function GET(request: NextRequest) {
  const pool = getPool();
  if (!pool) {
    return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ success: false, error: 'User ID required' }, { status: 400 });
  }

  try {
    const result = await pool.query(`
      SELECT 
        ba.*,
        u.phone,
        u.preferred_name,
        u.name
      FROM billing_accounts ba
      JOIN users u ON u.id = ba.user_id
      WHERE ba.user_id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      return NextResponse.json({ 
        success: true, 
        data: { subscription_status: 'none', credits_balance: 0 } 
      });
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Failed to fetch subscription:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch subscription' }, { status: 500 });
  }
}
