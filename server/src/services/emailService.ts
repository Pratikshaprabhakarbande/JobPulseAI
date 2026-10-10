import nodemailer from 'nodemailer';
import { config } from '../config';
import { Job, JobMatch } from '../utils/types';

interface EmailJobEntry {
  job: Job;
  match: JobMatch;
}

interface EmailOptions {
  recipientEmail?: string;
  isTest?: boolean;
}

export async function sendJobDigestEmail(
  entries: EmailJobEntry[],
  optionsOrRecipient?: string | EmailOptions
): Promise<{ success: boolean; message: string }> {
  const options: EmailOptions = typeof optionsOrRecipient === 'string'
    ? { recipientEmail: optionsOrRecipient }
    : (optionsOrRecipient || {});

  const emailConfig = config.email;
  const rawTo = options.recipientEmail || emailConfig.to;

  if (!emailConfig.user || !emailConfig.pass || !rawTo) {
    return {
      success: false,
      message: 'Email not configured. Set EMAIL_USER, EMAIL_PASS, and EMAIL_TO in .env file.',
    };
  }

  // Sanitize recipient list
  const cleanTo = rawTo
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .join(', ');

  try {
    const transporter = nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: {
        user: emailConfig.user,
        pass: emailConfig.pass,
      },
    });

    const topJobs = entries
      .sort((a, b) => b.match.matchScore - a.match.matchScore)
      .slice(0, 10);

    const jobRows = topJobs.map((entry, i) => {
      const scoreEmoji = entry.match.matchScore >= 80 ? '🔥' :
        entry.match.matchScore >= 65 ? '🟢' :
        entry.match.matchScore >= 50 ? '🟡' : '🔴';

      const applyLink = entry.job.applyUrl || entry.job.url;
      const isVerified = entry.job.verification?.status === 'VERIFIED_OPEN';
      const verifyBadge = isVerified
        ? '<span style="background: #dcfce7; color: #166534; font-size: 10px; padding: 2px 6px; border-radius: 4px; margin-left: 6px;">VERIFIED ACTIVE</span>'
        : '<span style="background: #fef9c3; color: #854d0e; font-size: 10px; padding: 2px 6px; border-radius: 4px; margin-left: 6px;">ACCESSIBLE (LIKELY OPEN)</span>';

      const postedDateStr = entry.job.postedDate
        ? new Date(entry.job.postedDate).toLocaleDateString()
        : 'Posting date unverified';

      const verifiedTimeStr = entry.job.verification?.checkedAt
        ? new Date(entry.job.verification.checkedAt).toLocaleTimeString()
        : 'Recently';

      return `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 16px;">
            <div style="font-weight: 600; color: #1f2937; font-size: 16px;">
              ${i + 1}. ${entry.job.title} ${verifyBadge}
            </div>
            <div style="color: #6b7280; margin-top: 4px;">🏢 <strong>${entry.job.company}</strong> • 📍 ${entry.job.location}</div>
            <div style="color: #6b7280; margin-top: 2px;">💼 ${entry.job.experienceLevel} • ${entry.job.workMode} • Source: <strong>${entry.job.source}</strong></div>
            <div style="color: #9ca3af; font-size: 11px; margin-top: 2px;">🕒 Published: ${postedDateStr} • Verified: ${verifiedTimeStr}</div>
            <div style="margin-top: 8px;">
              <span style="font-size: 18px; font-weight: 700; color: ${entry.match.matchScore >= 80 ? '#059669' : entry.match.matchScore >= 65 ? '#16a34a' : '#ca8a04'};">
                ${scoreEmoji} ${entry.match.matchScore}% Resume Match
              </span>
            </div>
            <div style="color: #4b5563; margin-top: 4px; font-size: 13px;">
              ✅ <strong>Skills Matched:</strong> ${entry.match.skillsMatched.slice(0, 6).join(', ') || 'Core role alignment'}
              ${entry.match.skillsMissing.length > 0 ? `<br/>⚠️ <strong>Skills to Highlight:</strong> ${entry.match.skillsMissing.slice(0, 3).join(', ')}` : ''}
            </div>
            <div style="margin-top: 8px; font-size: 11px; color: #6b7280; word-break: break-all;">
              🔗 <strong>Direct Link:</strong> <a href="${applyLink}" style="color: #4f46e5; text-decoration: underline;">${applyLink}</a>
            </div>
            <div style="margin-top: 12px;">
              <a href="${applyLink}" target="_blank" rel="noopener noreferrer" style="background: #6366f1; color: white; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 600; display: inline-block;">
                Apply Now →
              </a>
            </div>
          </td>
        </tr>`;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f3f4f6; padding: 24px;">
        <div style="max-width: 640px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🚀 JobPulse AI</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0;">
              ${options.isTest ? '🧪 Automated Email Alert Test' : 'Your Automated Job Digest'}
            </p>
          </div>
          <div style="padding: 24px;">
            <p style="color: #374151; font-size: 16px;">Hello,</p>
            <p style="color: #4b5563;">
              JobPulse AI discovered <strong>${topJobs.length} top-ranked opportunities</strong> matching your resume and preferences:
            </p>
            <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
              ${jobRows}
            </table>
            <div style="margin-top: 24px; padding: 16px; background: #f8fafc; border-radius: 8px; text-align: center;">
              <p style="color: #6b7280; font-size: 13px; margin: 0;">
                Generated by JobPulse AI • Scheduled Automation Active
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>`;

    const subject = options.isTest
      ? `🧪 [Test Alert] JobPulse AI: ${topJobs.length} Matching Jobs Ready`
      : `🔥 JobPulse AI Daily Digest: ${topJobs.length} High-Match Opportunities`;

    await transporter.sendMail({
      from: emailConfig.from || emailConfig.user,
      to: cleanTo,
      subject,
      html: htmlContent,
    });

    return { success: true, message: `Email sent successfully to ${cleanTo}` };
  } catch (error: any) {
    console.error('Email send error:', error);
    return { success: false, message: `Email failed: ${error.message}` };
  }
}
