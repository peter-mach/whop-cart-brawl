import { waitUntil } from '@vercel/functions';
import { makeWebhookValidator } from '@whop/api';
import type { NextRequest } from 'next/server';
import { sendPushNotification } from '@/lib/whop-api';

const validateWebhook = makeWebhookValidator({
  webhookSecret: process.env.WHOP_WEBHOOK_SECRET ?? 'fallback',
});

export async function POST(request: NextRequest): Promise<Response> {
  try {
    // Validate the webhook to ensure it's from Whop
    const webhookData = await validateWebhook(request);

    console.log('Received webhook:', webhookData.action, webhookData.data);

    // Handle different webhook events
    switch (webhookData.action) {
      case 'payment.succeeded':
        waitUntil(handlePaymentSucceeded(webhookData.data));
        break;

      case 'payment.failed':
        waitUntil(handlePaymentFailed(webhookData.data));
        break;

      case 'user.created':
        waitUntil(handleUserCreated(webhookData.data));
        break;

      case 'user.updated':
        waitUntil(handleUserUpdated(webhookData.data));
        break;

      case 'subscription.created':
        waitUntil(handleSubscriptionCreated(webhookData.data));
        break;

      case 'subscription.cancelled':
        waitUntil(handleSubscriptionCancelled(webhookData.data));
        break;

      default:
        console.log(`Unhandled webhook action: ${webhookData.action}`);
    }

    // Make sure to return a 2xx status code quickly. Otherwise the webhook will be retried.
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

// Event handlers

async function handlePaymentSucceeded(data: any) {
  const { id, final_amount, amount_after_fees, currency, user_id } = data;

  console.log(
    `Payment ${id} succeeded for ${user_id} with amount ${final_amount} ${currency}`
  );

  // Handle successful payment - could be competition entry fee or prize funding
  if (user_id) {
    await sendPushNotification(
      user_id,
      'Payment Successful',
      `Your payment of ${final_amount} ${currency} has been processed successfully.`,
      {
        paymentId: id,
        amount: final_amount,
        currency,
      }
    );
  }

  // TODO: Update competition status if this was prize funding
  // TODO: Add participant to competition if this was an entry fee
}

async function handlePaymentFailed(data: any) {
  const { id, user_id, error_message } = data;

  console.log(`Payment ${id} failed for ${user_id}: ${error_message}`);

  if (user_id) {
    await sendPushNotification(
      user_id,
      'Payment Failed',
      'Your payment could not be processed. Please try again or contact support.',
      {
        paymentId: id,
        error: error_message,
      }
    );
  }
}

async function handleUserCreated(data: any) {
  const { id, username, email } = data;

  console.log(`New user created: ${id} (${username})`);

  // Welcome new user
  await sendPushNotification(
    id,
    'Welcome to CartBrawl!',
    'Start competing with other Shopify stores and win prizes!',
    {
      isWelcome: true,
    }
  );
}

async function handleUserUpdated(data: any) {
  const { id } = data;

  console.log(`User updated: ${id}`);

  // Handle user profile updates if needed
  // This could be useful for updating cached user data
}

async function handleSubscriptionCreated(data: any) {
  const { id, user_id, plan_id } = data;

  console.log(
    `Subscription created: ${id} for user ${user_id} on plan ${plan_id}`
  );

  // Handle new subscription - could unlock premium features
  if (user_id) {
    await sendPushNotification(
      user_id,
      'Subscription Active',
      'Your subscription is now active! Enjoy premium features.',
      {
        subscriptionId: id,
        planId: plan_id,
      }
    );
  }
}

async function handleSubscriptionCancelled(data: any) {
  const { id, user_id } = data;

  console.log(`Subscription cancelled: ${id} for user ${user_id}`);

  // Handle subscription cancellation
  if (user_id) {
    await sendPushNotification(
      user_id,
      'Subscription Cancelled',
      'Your subscription has been cancelled. You can reactivate anytime.',
      {
        subscriptionId: id,
      }
    );
  }
}
