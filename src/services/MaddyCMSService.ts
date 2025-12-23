import axios from 'axios';

export interface SendSMSRequest {
  recipients: Array<{ phone: string; variables?: Record<string, string> }>;
  message: string;
  sender_id?: string;
}

export interface SendEmailRequest {
  to: string;
  to_name?: string;
  subject: string;
  html?: string;
  text?: string;
  variables?: Record<string, string>;
}

export interface SendBulkEmailRequest {
  recipients: Array<{ email: string; name?: string; variables?: Record<string, string> }>;
  subject: string;
  html?: string;
  text?: string;
}

export class MaddyCMSService {
  private clientId: string;
  private secretKey: string;
  private baseURL: string;

  constructor() {
    this.clientId = process.env.MADDYCMS_CLIENT_ID!;
    this.secretKey = process.env.MADDYCMS_SECRET_KEY!;
    this.baseURL = process.env.MADDYCMS_BASE_URL!;

    if (!this.clientId || !this.secretKey || !this.baseURL) {
      throw new Error('MaddyCMS credentials are not configured properly');
    }
  }

  private getAuthHeader() {
    const auth = Buffer.from(`${this.clientId}:${this.secretKey}`).toString('base64');
    return {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Send SMS to one or multiple recipients
   * MaddyCMS uses the same endpoint for both single and bulk SMS
   */
  async sendSMS(data: SendSMSRequest): Promise<any> {
    try {
      console.log('Sending SMS request to MaddyCMS:', {
        url: `${this.baseURL}/sms/send`,
        recipientCount: data.recipients.length
      });

      const response = await axios.post(
        `${this.baseURL}/sms/send`,
        data,
        { headers: this.getAuthHeader() }
      );

      console.log('MaddyCMS SMS Response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('MaddyCMS SMS Error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      throw new Error(error.response?.data?.detail || error.response?.data?.message || 'Failed to send SMS');
    }
  }

  /**
   * Send bulk SMS - uses the same endpoint as sendSMS
   * This is a convenience method that formats the data correctly
   */
  async sendBulkSMS(phoneNumbers: string[], message: string, senderId?: string): Promise<any> {
    const recipients = phoneNumbers.map(phone => ({ phone }));
    
    const requestData: SendSMSRequest = {
      recipients,
      message,
      ...(senderId && { sender_id: senderId })
    };

    return this.sendSMS(requestData);
  }

  /**
   * Send a single email
   */
  async sendEmail(data: SendEmailRequest): Promise<any> {
    try {
      console.log('Sending email request to MaddyCMS:', {
        url: `${this.baseURL}/email/send`,
        to: data.to
      });

      const response = await axios.post(
        `${this.baseURL}/email/send`,
        data,
        { headers: this.getAuthHeader() }
      );

      console.log('MaddyCMS Email Response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('MaddyCMS Email Error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      throw new Error(error.response?.data?.detail || error.response?.data?.message || 'Failed to send email');
    }
  }

  /**
   * Send bulk emails
   */
  async sendBulkEmail(data: SendBulkEmailRequest): Promise<any> {
    try {
      console.log('Sending bulk email request to MaddyCMS:', {
        url: `${this.baseURL}/email/send-bulk`,
        recipientCount: data.recipients.length
      });

      const response = await axios.post(
        `${this.baseURL}/email/send-bulk`,
        data,
        { headers: this.getAuthHeader() }
      );

      console.log('MaddyCMS Bulk Email Response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('MaddyCMS Bulk Email Error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      throw new Error(error.response?.data?.detail || error.response?.data?.message || 'Failed to send bulk email');
    }
  }

  /**
   * Check SMS delivery status
   */
  async getSMSStatus(messageId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseURL}/sms/status/${messageId}`,
        { headers: this.getAuthHeader() }
      );
      return response.data;
    } catch (error: any) {
      console.error('MaddyCMS Status Error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.detail || 'Failed to get SMS status');
    }
  }

  /**
   * Test API key
   */
  async testConnection(): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseURL}/test`,
        { headers: this.getAuthHeader() }
      );
      console.log('MaddyCMS Connection Test:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('MaddyCMS Connection Test Error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.detail || 'Failed to test connection');
    }
  }
}