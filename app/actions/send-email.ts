'use server';

import React from 'react';
import { Resend } from 'resend';
import { EmailTemplate } from '@/components/EmailTemplate';

export interface SendOnboardingEmailParams {
  toEmail: string;
  firstName: string;
  loginUrl?: string;
}

export interface SendEmailResponse {
  success: boolean;
  data?: any;
  error?: string;
}

const resendApiKey = process.env.RESEND_API_KEY || '';
const resend = new Resend(resendApiKey);

export async function sendOnboardingEmail({
  toEmail,
  firstName,
  loginUrl,
}: SendOnboardingEmailParams): Promise<SendEmailResponse> {
  try {
    if (!toEmail || !firstName) {
      return {
        success: false,
        error: 'Both "toEmail" and "firstName" parameters are required.',
      };
    }

    if (!resendApiKey) {
      console.warn('[Resend] RESEND_API_KEY environment variable is not defined.');
    }

    const sender = process.env.EMAIL_FROM || 'onboarding@resend.dev';

    const { data, error } = await resend.emails.send({
      from: sender,
      to: [toEmail],
      subject: `Welcome aboard, ${firstName}!`,
      react: React.createElement(EmailTemplate, { firstName, loginUrl }),
    });

    if (error) {
      console.error('[Resend API Error]:', error);
      return {
        success: false,
        error: error.message || 'Failed to send onboarding email via Resend.',
      };
    }

    return {
      success: true,
      data,
    };
  } catch (err: any) {
    console.error('[sendOnboardingEmail Error]:', err);
    return {
      success: false,
      error: err?.message || 'An unexpected error occurred while sending email.',
    };
  }
}
