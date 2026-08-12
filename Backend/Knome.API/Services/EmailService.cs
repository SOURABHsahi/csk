using System.Text.Encodings.Web;
using Knome.API.Configurations;
using Knome.API.Interfaces;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;

namespace Knome.API.Services;

public class EmailService : IEmailService
{
    private readonly SmtpSettings _settings;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IOptions<SmtpSettings> settings, ILogger<EmailService> logger)
    {
        _settings = settings.Value;
        _logger = logger;
    }

    public async Task<bool> SendEmailAsync(string toEmail, string subject, string htmlBody)
    {
        if (string.IsNullOrWhiteSpace(toEmail))
        {
            _logger.LogWarning("SendEmailAsync aborted: recipient email is empty.");
            return false;
        }

        try
        {
            var message = new MimeMessage();
            var fromEmail = !string.IsNullOrWhiteSpace(_settings.SenderEmail) ? _settings.SenderEmail : _settings.Username;
            message.From.Add(new MailboxAddress(_settings.SenderName, fromEmail));
            message.To.Add(MailboxAddress.Parse(toEmail.Trim()));
            message.Subject = subject;

            var bodyBuilder = new BodyBuilder { HtmlBody = htmlBody };
            message.Body = bodyBuilder.ToMessageBody();

            using var client = new SmtpClient();
            var secureOption = _settings.EnableSsl 
                ? (_settings.Port == 465 ? SecureSocketOptions.SslOnConnect : SecureSocketOptions.Auto) 
                : SecureSocketOptions.None;
            
            await client.ConnectAsync(_settings.Host, _settings.Port, secureOption);
            if (!string.IsNullOrEmpty(_settings.Username) && !string.IsNullOrEmpty(_settings.Password))
            {
                await client.AuthenticateAsync(_settings.Username, _settings.Password);
            }

            await client.SendAsync(message);
            await client.DisconnectAsync(true);

            _logger.LogInformation("Email sent successfully to {ToEmail} with Subject: {Subject}", toEmail, subject);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {ToEmail} with Subject: {Subject}", toEmail, subject);
            // Non-blocking: email failure will not crash calling services
            return false;
        }
    }

    public async Task<bool> SendRolePendingEmailAsync(string toEmail, string fullName, string employeeId, string departmentName, string designation)
    {
        var safeName = HtmlEncoder.Default.Encode(fullName ?? "Team Member");
        var safeEmpId = HtmlEncoder.Default.Encode(employeeId ?? "");
        var safeDept = HtmlEncoder.Default.Encode(departmentName ?? "General");
        var safeDesig = HtmlEncoder.Default.Encode(designation ?? "Employee");

        var html = $@"
<!DOCTYPE html>
<html lang=""en"">
<head>
    <meta charset=""UTF-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <title>Role Assignment Pending - Knome</title>
</head>
<body style=""margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;"">
    <table role=""presentation"" width=""100%"" cellspacing=""0"" cellpadding=""0"" style=""background-color: #f1f5f9; padding: 40px 15px;"">
        <tr>
            <td align=""center"">
                <!-- Main Container Card -->
                <table role=""presentation"" width=""100%"" style=""max-width: 600px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06); border: 1px solid #e2e8f0;"" cellspacing=""0"" cellpadding=""0"">
                    
                    <!-- Header Banner -->
                    <tr>
                        <td style=""background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 36px 32px; text-align: center;"">
                            <div style=""display: inline-block; background-color: rgba(255, 255, 255, 0.15); padding: 6px 16px; border-radius: 9999px; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; color: #ffffff; margin-bottom: 12px; border: 1px solid rgba(255, 255, 255, 0.2);"">
                                MPOnline Limited • Enterprise Portal
                            </div>
                            <h1 style=""margin: 0; color: #ffffff; font-size: 26px; font-weight: 900; letter-spacing: -0.5px;"">
                                KNOME
                            </h1>
                            <p style=""margin: 6px 0 0 0; color: #e0e7ff; font-size: 13px; font-weight: 500;"">
                                Knowledge Management & Excellence Platform
                            </p>
                        </td>
                    </tr>

                    <!-- Body Content -->
                    <tr>
                        <td style=""padding: 36px 32px;"">
                            <h2 style=""margin: 0 0 12px 0; font-size: 20px; font-weight: 800; color: #0f172a;"">
                                Welcome, {safeName}! 👋
                            </h2>
                            <p style=""margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475569;"">
                                Your account has been initialized via <strong>EmployeeHub Single Sign-On (SSO)</strong>. Your profile is currently under review for role assignment.
                            </p>

                            <!-- Status Badge Box -->
                            <div style=""background-color: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #f59e0b; border-radius: 12px; padding: 18px 20px; margin-bottom: 24px;"">
                                <div style=""display: flex; align-items: center; margin-bottom: 8px;"">
                                    <span style=""font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #b45309;"">
                                        ⏳ Account Status: Role Assignment Pending
                                    </span>
                                </div>
                                <p style=""margin: 0; font-size: 13px; color: #78350f; line-height: 1.5;"">
                                    Your request has been forwarded to the <strong>System Administrator</strong>. Once your access role is assigned, you will receive full permissions.
                                </p>
                            </div>

                            <!-- Details Table -->
                            <table role=""presentation"" width=""100%"" style=""background-color: #f8fafc; border-radius: 12px; padding: 16px; border: 1px solid #e2e8f0; margin-bottom: 24px;"" cellspacing=""0"" cellpadding=""0"">
                                <tr>
                                    <td style=""padding: 8px 12px; font-size: 12px; font-weight: 700; color: #64748b; width: 40%;"">Employee ID</td>
                                    <td style=""padding: 8px 12px; font-size: 13px; font-weight: 700; color: #0f172a;"">{safeEmpId}</td>
                                </tr>
                                <tr>
                                    <td style=""padding: 8px 12px; font-size: 12px; font-weight: 700; color: #64748b; border-top: 1px solid #e2e8f0;"">Department</td>
                                    <td style=""padding: 8px 12px; font-size: 13px; font-weight: 600; color: #0f172a; border-top: 1px solid #e2e8f0;"">{safeDept}</td>
                                </tr>
                                <tr>
                                    <td style=""padding: 8px 12px; font-size: 12px; font-weight: 700; color: #64748b; border-top: 1px solid #e2e8f0;"">Designation</td>
                                    <td style=""padding: 8px 12px; font-size: 13px; font-weight: 600; color: #0f172a; border-top: 1px solid #e2e8f0;"">{safeDesig}</td>
                                </tr>
                            </table>

                            <p style=""margin: 0 0 20px 0; font-size: 13px; line-height: 1.6; color: #64748b;"">
                                You do not need to take any action at this time. You will receive an automated confirmation email as soon as the System Administrator approves your role.
                            </p>

                            <!-- Security Notice -->
                            <div style=""border-top: 1px solid #f1f5f9; padding-top: 20px; font-size: 12px; color: #94a3b8; line-height: 1.5;"">
                                If you did not request access to Knome, please report this to your IT Operations team.
                            </div>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style=""background-color: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;"">
                            <p style=""margin: 0 0 6px 0; font-size: 12px; font-weight: 700; color: #64748b;"">
                                © 2026 MPOnline Limited. All rights reserved.
                            </p>
                            <p style=""margin: 0; font-size: 11px; color: #94a3b8;"">
                                Knome Enterprise Knowledge & Collaboration Network • Internal Confidential
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>";

        return await SendEmailAsync(toEmail, "⏳ Welcome to Knome - Role Assignment Pending", html);
    }

    public async Task<bool> SendRoleAssignedEmailAsync(string toEmail, string fullName, string employeeId, string roleName, string departmentName, string? adminComment = null)
    {
        var safeName = HtmlEncoder.Default.Encode(fullName ?? "Team Member");
        var safeEmpId = HtmlEncoder.Default.Encode(employeeId ?? "");
        var safeRole = HtmlEncoder.Default.Encode(roleName ?? "Employee");
        var safeDept = HtmlEncoder.Default.Encode(departmentName ?? "General");
        var safeComment = !string.IsNullOrWhiteSpace(adminComment) ? HtmlEncoder.Default.Encode(adminComment) : null;

        var html = $@"
<!DOCTYPE html>
<html lang=""en"">
<head>
    <meta charset=""UTF-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <title>Role Assigned - Knome</title>
</head>
<body style=""margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;"">
    <table role=""presentation"" width=""100%"" cellspacing=""0"" cellpadding=""0"" style=""background-color: #f1f5f9; padding: 40px 15px;"">
        <tr>
            <td align=""center"">
                <!-- Main Container Card -->
                <table role=""presentation"" width=""100%"" style=""max-width: 600px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06); border: 1px solid #e2e8f0;"" cellspacing=""0"" cellpadding=""0"">
                    
                    <!-- Header Banner (Emerald Success Gradient) -->
                    <tr>
                        <td style=""background: linear-gradient(135deg, #059669 0%, #0284c7 100%); padding: 36px 32px; text-align: center;"">
                            <div style=""display: inline-block; background-color: rgba(255, 255, 255, 0.18); padding: 6px 16px; border-radius: 9999px; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; color: #ffffff; margin-bottom: 12px; border: 1px solid rgba(255, 255, 255, 0.2);"">
                                Access Approved & Activated
                            </div>
                            <h1 style=""margin: 0; color: #ffffff; font-size: 26px; font-weight: 900; letter-spacing: -0.5px;"">
                                KNOME
                            </h1>
                            <p style=""margin: 6px 0 0 0; color: #e0f2fe; font-size: 13px; font-weight: 500;"">
                                Knowledge Management & Excellence Platform
                            </p>
                        </td>
                    </tr>

                    <!-- Body Content -->
                    <tr>
                        <td style=""padding: 36px 32px;"">
                            <h2 style=""margin: 0 0 12px 0; font-size: 20px; font-weight: 800; color: #0f172a;"">
                                Congratulations, {safeName}! 🎉
                            </h2>
                            <p style=""margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475569;"">
                                Your role in Knome has been approved and assigned by the <strong>System Administrator</strong>. You now have full access to explore, collaborate, and contribute.
                            </p>

                            <!-- Role Highlight Card -->
                            <div style=""background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border: 1px solid #bbf7d0; border-left: 5px solid #10b981; border-radius: 14px; padding: 20px; margin-bottom: 24px; text-align: center;"">
                                <span style=""font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #047857;"">
                                    Your Assigned Role
                                </span>
                                <h3 style=""margin: 6px 0 0 0; font-size: 22px; font-weight: 900; color: #065f46;"">
                                    {safeRole}
                                </h3>
                            </div>

                            <!-- Assignment Details -->
                            <table role=""presentation"" width=""100%"" style=""background-color: #f8fafc; border-radius: 12px; padding: 16px; border: 1px solid #e2e8f0; margin-bottom: 28px;"" cellspacing=""0"" cellpadding=""0"">
                                <tr>
                                    <td style=""padding: 8px 12px; font-size: 12px; font-weight: 700; color: #64748b; width: 40%;"">Employee ID</td>
                                    <td style=""padding: 8px 12px; font-size: 13px; font-weight: 700; color: #0f172a;"">{safeEmpId}</td>
                                </tr>
                                <tr>
                                    <td style=""padding: 8px 12px; font-size: 12px; font-weight: 700; color: #64748b; border-top: 1px solid #e2e8f0;"">Department</td>
                                    <td style=""padding: 8px 12px; font-size: 13px; font-weight: 600; color: #0f172a; border-top: 1px solid #e2e8f0;"">{safeDept}</td>
                                </tr>
                                <tr>
                                    <td style=""padding: 8px 12px; font-size: 12px; font-weight: 700; color: #64748b; border-top: 1px solid #e2e8f0;"">Assigned By</td>
                                    <td style=""padding: 8px 12px; font-size: 13px; font-weight: 600; color: #0f172a; border-top: 1px solid #e2e8f0;"">System Administrator</td>
                                </tr>
                                {(safeComment != null ? $@"
                                <tr>
                                    <td style=""padding: 8px 12px; font-size: 12px; font-weight: 700; color: #64748b; border-top: 1px solid #e2e8f0;"">Admin Note</td>
                                    <td style=""padding: 8px 12px; font-size: 13px; font-style: italic; color: #334155; border-top: 1px solid #e2e8f0;"">{safeComment}</td>
                                </tr>" : "")}
                            </table>

                            <!-- CTA Button -->
                            <div style=""text-align: center; margin-bottom: 24px;"">
                                <a href=""http://localhost:5173"" style=""display: inline-block; background: linear-gradient(135deg, #059669 0%, #0284c7 100%); color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 800; padding: 14px 32px; border-radius: 12px; box-shadow: 0 4px 14px rgba(5, 150, 105, 0.35); letter-spacing: 0.3px;"">
                                    Launch Knome Portal →
                                </a>
                            </div>

                            <p style=""margin: 0; font-size: 13px; line-height: 1.6; color: #64748b; text-align: center;"">
                                You can now publish knowledge posts, interact in communities, and earn Karma Points on the platform.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style=""background-color: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;"">
                            <p style=""margin: 0 0 6px 0; font-size: 12px; font-weight: 700; color: #64748b;"">
                                © 2026 MPOnline Limited. All rights reserved.
                            </p>
                            <p style=""margin: 0; font-size: 11px; color: #94a3b8;"">
                                Knome Enterprise Knowledge & Collaboration Network • Internal Confidential
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>";

        return await SendEmailAsync(toEmail, $"✅ Your Role in Knome has been Assigned: {safeRole}", html);
    }

    public async Task SendTemplateEmailAsync(string toEmail, string templateName, object model)
    {
        string htmlBody = $"<h2>Knome Notification</h2><p>{templateName}</p>";
        await SendEmailAsync(toEmail, "Knome Enterprise Alert", htmlBody);
    }
}
