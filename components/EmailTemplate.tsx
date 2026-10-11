import React from 'react';

export interface EmailTemplateProps {
  firstName: string;
  loginUrl?: string;
}

export const EmailTemplate: React.FC<Readonly<EmailTemplateProps>> = ({
  firstName,
  loginUrl = 'https://example.com/login',
}) => {
  return (
    <div
      style={{
        fontFamily: 'Helvetica, Arial, sans-serif',
        lineHeight: '1.6',
        color: '#1a202c',
        padding: '24px',
        backgroundColor: '#f7fafc',
      }}
    >
      <div
        style={{
          maxWidth: '560px',
          margin: '0 auto',
          background: '#ffffff',
          borderRadius: '8px',
          padding: '32px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        }}
      >
        <h1
          style={{
            fontSize: '22px',
            color: '#2d3748',
            marginBottom: '16px',
          }}
        >
          Welcome to the Platform, {firstName}!
        </h1>
        <p style={{ fontSize: '15px', color: '#4a5568', marginBottom: '20px' }}>
          We are thrilled to have you on board. Your account has been provisioned and is ready to use.
        </p>
        <p style={{ marginBottom: '28px' }}>
          <a
            href={loginUrl}
            style={{
              backgroundColor: '#3182ce',
              color: '#ffffff',
              padding: '10px 20px',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: 600,
              display: 'inline-block',
            }}
          >
            Access Your Dashboard
          </a>
        </p>
        <hr style={{ borderColor: '#e2e8f0', margin: '24px 0' }} />
        <p style={{ fontSize: '12px', color: '#a0aec0', margin: 0 }}>
          If you did not request this account, please ignore this email or contact support.
        </p>
      </div>
    </div>
  );
};

export default EmailTemplate;
