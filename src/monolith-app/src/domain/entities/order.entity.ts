/**
 * Order Domain Entity
 * 
 * Represents a purchase order for pets in a store.
 * Business entity for order processing and management.
 * 
 * Business Rules:
 * - Each order must have a unique order number
 * - Order must reference an existing pet
 * - Customer ID is required for order tracking
 * - Quantity must be positive
 * - Total amount is calculated from pet price and quantity
 * - Order status tracks the fulfillment process
 * - Orders belong to a specific store
 */

export type OrderStatus = 'placed' | 'approved' | 'delivered' | 'cancelled';

export class Order {
  /**
   * Unique order identifier
   * Format: order-{number} (e.g., "order-001")
   */
  public readonly orderNumber: string;

  /**
   * ID of the ordered pet
   * References Pet entity
   */
  public petId: string;

  /**
   * Customer identifier
   * References customer in external system
   */
  public customerId: string;

  /**
   * Order quantity
   * Must be positive integer
   */
  public quantity: number;

  /**
   * Order status
   * Tracks fulfillment process
   */
  public status: OrderStatus;

  /**
   * Order placement timestamp
   * When the order was created
   */
  public readonly orderDate: Date;

  /**
   * Total order amount in USD
   * Calculated from pet price and quantity
   */
  public totalAmount: number;

  /**
   * Store where order was placed
   * Required for store operations
   */
  public storeId: string;

  /**
   * Order notes or special instructions
   */
  public notes?: string;

  /**
   * Customer contact information
   */
  public customerName?: string;
  public customerEmail?: string;
  public customerPhone?: string;

  /**
   * Delivery information
   */
  public deliveryAddress?: string;
  public deliveryDate?: Date;

  /**
   * Payment information
   */
  public paymentMethod?: string;
  public paymentStatus?: 'pending' | 'paid' | 'failed';

  /**
   * Creation timestamp
   * When order record was created
   */
  public readonly createdAt: Date;

  /**
   * Last update timestamp
   * Updated when order information changes
   */
  public updatedAt: Date;

  constructor(
    orderNumber: string,
    petId: string,
    customerId: string,
    quantity: number,
    totalAmount: number,
    storeId: string,
    status: OrderStatus = 'placed',
    orderDate?: Date,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    this.orderNumber = orderNumber;
    this.petId = petId;
    this.customerId = customerId;
    this.quantity = quantity;
    this.totalAmount = totalAmount;
    this.storeId = storeId;
    this.status = status;
    this.orderDate = orderDate || new Date();
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
  }

  /**
   * Update order status
   * Tracks order progression
   */
  public updateStatus(status: OrderStatus): void {
    this.status = status;
    this.updatedAt = new Date();
  }

  /**
   * Update customer information
   */
  public updateCustomerInfo(
    customerName?: string,
    customerEmail?: string,
    customerPhone?: string,
  ): void {
    if (customerName !== undefined) {
      this.customerName = customerName;
    }
    if (customerEmail !== undefined) {
      this.customerEmail = customerEmail;
    }
    if (customerPhone !== undefined) {
      this.customerPhone = customerPhone;
    }
    this.updatedAt = new Date();
  }

  /**
   * Update delivery information
   */
  public updateDeliveryInfo(
    deliveryAddress?: string,
    deliveryDate?: Date,
  ): void {
    if (deliveryAddress !== undefined) {
      this.deliveryAddress = deliveryAddress;
    }
    if (deliveryDate !== undefined) {
      this.deliveryDate = deliveryDate;
    }
    this.updatedAt = new Date();
  }

  /**
   * Update payment information
   */
  public updatePaymentInfo(
    paymentMethod?: string,
    paymentStatus?: 'pending' | 'paid' | 'failed',
  ): void {
    if (paymentMethod !== undefined) {
      this.paymentMethod = paymentMethod;
    }
    if (paymentStatus !== undefined) {
      this.paymentStatus = paymentStatus;
    }
    this.updatedAt = new Date();
  }

  /**
   * Add or update order notes
   */
  public updateNotes(notes: string): void {
    this.notes = notes;
    this.updatedAt = new Date();
  }

  /**
   * Approve the order
   * Moves from placed to approved status
   */
  public approve(): void {
    if (this.status === 'placed') {
      this.updateStatus('approved');
    }
  }

  /**
   * Mark order as delivered
   * Completes the order fulfillment
   */
  public markAsDelivered(): void {
    if (this.status === 'approved') {
      this.updateStatus('delivered');
      this.deliveryDate = new Date();
    }
  }

  /**
   * Cancel the order
   * Can cancel from placed or approved status
   */
  public cancel(): void {
    if (this.status === 'placed' || this.status === 'approved') {
      this.updateStatus('cancelled');
    }
  }

  /**
   * Calculate total from unit price and quantity
   * Utility for updating totals
   */
  public recalculateTotal(unitPrice: number): void {
    this.totalAmount = unitPrice * this.quantity;
    this.updatedAt = new Date();
  }

  /**
   * Check if order can be modified
   * Orders can only be modified if not delivered or cancelled
   */
  public canBeModified(): boolean {
    return this.status === 'placed' || this.status === 'approved';
  }

  /**
   * Check if order is in final state
   */
  public isFinal(): boolean {
    return this.status === 'delivered' || this.status === 'cancelled';
  }

  /**
   * Check if order is pending fulfillment
   */
  public isPending(): boolean {
    return this.status === 'placed' || this.status === 'approved';
  }

  /**
   * Get order age in days
   */
  public getAgeInDays(): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - this.orderDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Validate order data
   * Ensures business rules are met
   */
  public validate(): string[] {
    const errors: string[] = [];

    if (!this.orderNumber || this.orderNumber.trim() === '') {
      errors.push('Order number is required');
    }

    if (!this.petId || this.petId.trim() === '') {
      errors.push('Pet ID is required');
    }

    if (!this.customerId || this.customerId.trim() === '') {
      errors.push('Customer ID is required');
    }

    if (!this.storeId || this.storeId.trim() === '') {
      errors.push('Store ID is required');
    }

    if (this.quantity <= 0) {
      errors.push('Order quantity must be positive');
    }

    if (this.totalAmount < 0) {
      errors.push('Total amount must be non-negative');
    }

    if (this.orderNumber && !this.orderNumber.match(/^order-\d+$/)) {
      errors.push('Order number must follow format: order-{number}');
    }

    if (this.customerEmail && !this.customerEmail.includes('@')) {
      errors.push('Invalid customer email format');
    }

    return errors;
  }

  /**
   * Convert to plain object for serialization
   * Used for API responses and database storage
   */
  public toPlainObject(): Record<string, any> {
    return {
      orderNumber: this.orderNumber,
      petId: this.petId,
      customerId: this.customerId,
      quantity: this.quantity,
      status: this.status,
      orderDate: this.orderDate.toISOString(),
      totalAmount: this.totalAmount,
      storeId: this.storeId,
      notes: this.notes,
      customerName: this.customerName,
      customerEmail: this.customerEmail,
      customerPhone: this.customerPhone,
      deliveryAddress: this.deliveryAddress,
      deliveryDate: this.deliveryDate?.toISOString(),
      paymentMethod: this.paymentMethod,
      paymentStatus: this.paymentStatus,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }

  /**
   * Create order from plain object
   * Used for database deserialization
   */
  public static fromPlainObject(data: Record<string, any>): Order {
    const order = new Order(
      data.orderNumber,
      data.petId,
      data.customerId,
      data.quantity,
      data.totalAmount,
      data.storeId,
      data.status || 'placed',
      data.orderDate ? new Date(data.orderDate) : undefined,
      data.createdAt ? new Date(data.createdAt) : undefined,
      data.updatedAt ? new Date(data.updatedAt) : undefined,
    );

    // Set additional properties
    if (data.notes !== undefined) order.notes = data.notes;
    if (data.customerName !== undefined) order.customerName = data.customerName;
    if (data.customerEmail !== undefined) order.customerEmail = data.customerEmail;
    if (data.customerPhone !== undefined) order.customerPhone = data.customerPhone;
    if (data.deliveryAddress !== undefined) order.deliveryAddress = data.deliveryAddress;
    if (data.deliveryDate) order.deliveryDate = new Date(data.deliveryDate);
    if (data.paymentMethod !== undefined) order.paymentMethod = data.paymentMethod;
    if (data.paymentStatus !== undefined) order.paymentStatus = data.paymentStatus;

    return order;
  }

  /**
   * Create a new order with generated order number
   * Utility method for order creation
   */
  public static create(
    petId: string,
    customerId: string,
    quantity: number,
    unitPrice: number,
    storeId: string,
  ): Order {
    // Generate order number (in real implementation, this might come from a service)
    const timestamp = Date.now();
    const orderNumber = `order-${timestamp}`;
    const totalAmount = unitPrice * quantity;
    
    return new Order(orderNumber, petId, customerId, quantity, totalAmount, storeId);
  }

  /**
   * Get formatted total amount string
   */
  public getFormattedTotal(): string {
    return `$${this.totalAmount.toFixed(2)}`;
  }

  /**
   * Get unit price from total and quantity
   */
  public getUnitPrice(): number {
    return this.quantity > 0 ? this.totalAmount / this.quantity : 0;
  }
}