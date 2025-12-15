import { Platform } from 'react-native';
import * as ApplePay from 'expo-apple-pay';
import * as GooglePay from 'expo-google-pay';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest } from './apiService';

class MobilePaymentService {
  constructor() {
    this.paymentMethods = {
      applePay: false,
      googlePay: false,
      creditCard: true, // Always available as fallback
    };
    this.initializePaymentMethods();
  }

  // Initialize available payment methods based on platform and device capabilities
  async initializePaymentMethods() {
    try {
      if (Platform.OS === 'ios') {
        // Check Apple Pay availability
        const applePayAvailable = await ApplePay.isApplePayAvailable();
        this.paymentMethods.applePay = applePayAvailable;
      } else if (Platform.OS === 'android') {
        // Check Google Pay availability
        const googlePayAvailable = await GooglePay.isGooglePayAvailable();
        this.paymentMethods.googlePay = googlePayAvailable;
      }

      // Store payment method availability
      await AsyncStorage.setItem('paymentMethods', JSON.stringify(this.paymentMethods));
    } catch (error) {
      console.error('Error initializing payment methods:', error);
    }
  }

  // Get available payment methods
  getAvailablePaymentMethods() {
    return this.paymentMethods;
  }

  // Process Apple Pay payment
  async processApplePayPayment(orderDetails) {
    if (!this.paymentMethods.applePay) {
      throw new Error('Apple Pay is not available on this device');
    }

    try {
      const paymentRequest = {
        countryCode: 'US',
        currencyCode: 'USD',
        merchantIdentifier: 'merchant.deals247.app',
        supportedNetworks: ['visa', 'mastercard', 'amex'],
        merchantCapabilities: ['3DS', 'debit', 'credit'],
        requiredBillingContactFields: ['postalAddress', 'name'],
        requiredShippingContactFields: ['postalAddress', 'name'],
        items: orderDetails.items.map(item => ({
          label: item.name,
          amount: item.price.toFixed(2),
          type: 'final',
        })),
        total: {
          label: 'Deals247 Purchase',
          amount: orderDetails.total.toFixed(2),
          type: 'final',
        },
      };

      const token = await ApplePay.requestPaymentAsync(paymentRequest);

      // Process the payment token with backend
      const paymentResult = await this.processPaymentWithBackend({
        paymentMethod: 'apple_pay',
        token: token,
        orderId: orderDetails.orderId,
        amount: orderDetails.total,
      });

      return paymentResult;
    } catch (error) {
      console.error('Apple Pay payment failed:', error);
      throw error;
    }
  }

  // Process Google Pay payment
  async processGooglePayPayment(orderDetails) {
    if (!this.paymentMethods.googlePay) {
      throw new Error('Google Pay is not available on this device');
    }

    try {
      const paymentRequest = {
        allowedPaymentMethods: [
          {
            type: 'CARD',
            parameters: {
              allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
              allowedCardNetworks: ['VISA', 'MASTERCARD', 'AMEX'],
            },
            tokenizationSpecification: {
              type: 'PAYMENT_GATEWAY',
              parameters: {
                gateway: 'stripe', // Or your payment processor
                gatewayMerchantId: 'your-merchant-id',
              },
            },
          },
        ],
        transactionInfo: {
          totalPriceStatus: 'FINAL',
          totalPrice: orderDetails.total.toFixed(2),
          currencyCode: 'USD',
          countryCode: 'US',
        },
        merchantInfo: {
          merchantName: 'Deals247',
          merchantId: 'your-merchant-id',
        },
      };

      const paymentData = await GooglePay.requestPaymentAsync(paymentRequest);

      // Process the payment data with backend
      const paymentResult = await this.processPaymentWithBackend({
        paymentMethod: 'google_pay',
        paymentData: paymentData,
        orderId: orderDetails.orderId,
        amount: orderDetails.total,
      });

      return paymentResult;
    } catch (error) {
      console.error('Google Pay payment failed:', error);
      throw error;
    }
  }

  // Process credit card payment (fallback)
  async processCreditCardPayment(orderDetails, cardDetails) {
    try {
      // Validate card details (basic validation)
      if (!this.validateCardDetails(cardDetails)) {
        throw new Error('Invalid card details');
      }

      // Process payment with backend
      const paymentResult = await this.processPaymentWithBackend({
        paymentMethod: 'credit_card',
        cardDetails: {
          number: cardDetails.number.replace(/\s/g, ''),
          expiryMonth: cardDetails.expiryMonth,
          expiryYear: cardDetails.expiryYear,
          cvv: cardDetails.cvv,
          name: cardDetails.name,
        },
        orderId: orderDetails.orderId,
        amount: orderDetails.total,
      });

      return paymentResult;
    } catch (error) {
      console.error('Credit card payment failed:', error);
      throw error;
    }
  }

  // Process payment with backend API
  async processPaymentWithBackend(paymentData) {
    try {
      const response = await apiRequest('/api/payments/process', {
        method: 'POST',
        body: JSON.stringify(paymentData),
      });

      if (!response.success) {
        throw new Error(response.message || 'Payment processing failed');
      }

      // Store payment confirmation locally
      await this.storePaymentConfirmation(response.paymentId, paymentData);

      return response;
    } catch (error) {
      console.error('Backend payment processing failed:', error);
      throw error;
    }
  }

  // Validate credit card details
  validateCardDetails(cardDetails) {
    const { number, expiryMonth, expiryYear, cvv, name } = cardDetails;

    // Basic validation
    if (!number || !expiryMonth || !expiryYear || !cvv || !name) {
      return false;
    }

    // Remove spaces and validate card number length
    const cleanNumber = number.replace(/\s/g, '');
    if (cleanNumber.length < 13 || cleanNumber.length > 19) {
      return false;
    }

    // Validate expiry date
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    const expYear = parseInt(expiryYear);
    const expMonth = parseInt(expiryMonth);

    if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
      return false;
    }

    // Validate CVV
    if (cvv.length < 3 || cvv.length > 4) {
      return false;
    }

    return true;
  }

  // Store payment confirmation for offline access
  async storePaymentConfirmation(paymentId, paymentData) {
    try {
      const confirmation = {
        paymentId,
        orderId: paymentData.orderId,
        amount: paymentData.amount,
        timestamp: new Date().toISOString(),
        method: paymentData.paymentMethod,
      };

      await AsyncStorage.setItem(`payment_${paymentId}`, JSON.stringify(confirmation));

      // Update payment history
      const history = await this.getPaymentHistory();
      history.push(confirmation);
      await AsyncStorage.setItem('paymentHistory', JSON.stringify(history));
    } catch (error) {
      console.error('Error storing payment confirmation:', error);
    }
  }

  // Get payment history
  async getPaymentHistory() {
    try {
      const history = await AsyncStorage.getItem('paymentHistory');
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('Error retrieving payment history:', error);
      return [];
    }
  }

  // Get specific payment details
  async getPaymentDetails(paymentId) {
    try {
      const payment = await AsyncStorage.getItem(`payment_${paymentId}`);
      return payment ? JSON.parse(payment) : null;
    } catch (error) {
      console.error('Error retrieving payment details:', error);
      return null;
    }
  }

  // Clear payment data (for privacy/compliance)
  async clearPaymentData() {
    try {
      const history = await this.getPaymentHistory();
      const deletePromises = history.map(payment =>
        AsyncStorage.removeItem(`payment_${payment.paymentId}`)
      );

      await Promise.all(deletePromises);
      await AsyncStorage.removeItem('paymentHistory');
      await AsyncStorage.removeItem('paymentMethods');
    } catch (error) {
      console.error('Error clearing payment data:', error);
    }
  }

  // Setup recurring payments for subscriptions
  async setupRecurringPayment(subscriptionDetails) {
    try {
      const response = await apiRequest('/api/payments/setup-recurring', {
        method: 'POST',
        body: JSON.stringify(subscriptionDetails),
      });

      if (response.success) {
        // Store subscription details locally
        await AsyncStorage.setItem('activeSubscription', JSON.stringify(response.subscription));
      }

      return response;
    } catch (error) {
      console.error('Error setting up recurring payment:', error);
      throw error;
    }
  }

  // Cancel recurring payment
  async cancelRecurringPayment(subscriptionId) {
    try {
      const response = await apiRequest('/api/payments/cancel-recurring', {
        method: 'POST',
        body: JSON.stringify({ subscriptionId }),
      });

      if (response.success) {
        await AsyncStorage.removeItem('activeSubscription');
      }

      return response;
    } catch (error) {
      console.error('Error canceling recurring payment:', error);
      throw error;
    }
  }

  // Get active subscription
  async getActiveSubscription() {
    try {
      const subscription = await AsyncStorage.getItem('activeSubscription');
      return subscription ? JSON.parse(subscription) : null;
    } catch (error) {
      console.error('Error retrieving active subscription:', error);
      return null;
    }
  }
}

// Create singleton instance
const mobilePaymentService = new MobilePaymentService();

export default mobilePaymentService;