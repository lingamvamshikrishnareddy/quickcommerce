const Subscription = require('../models/Subscription');
const User = require('../models/User');
const Product = require('../models/Product');
const mongoose = require('mongoose');

class SubscriptionController {
  // Create Subscription
  async createSubscription(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const userId = req.user.userId;
      const { 
        productId, 
        quantity = 1,
        frequency = 'weekly',
        deliveryDay = 'monday'
      } = req.body;

      // Validate product
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ 
          message: 'Product not found' 
        });
      }

      // Check product availability for subscription
      if (!product.allowSubscription) {
        return res.status(400).json({ 
          message: 'Product not available for subscription' 
        });
      }

      // Validate user
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ 
          message: 'User not found' 
        });
      }

      // Calculate next delivery date
      const nextDeliveryDate = this.calculateNextDeliveryDate(
        frequency, 
        deliveryDay
      );

      // Create subscription
      const subscription = new Subscription({
        user: userId,
        product: productId,
        quantity,
        frequency,
        deliveryDay,
        nextDeliveryDate,
        status: 'active',
        totalCost: product.price * quantity
      });

      await subscription.save({ session });

      await session.commitTransaction();
      session.endSession();

      res.status(201).json({
        message: 'Subscription created successfully',
        subscription
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();

      res.status(500).json({ 
        message: 'Error creating subscription',
        error: error.message 
      });
    }
  }

  // Calculate Next Delivery Date
  calculateNextDeliveryDate(frequency, deliveryDay) {
    const days = {
      'monday': 1, 'tuesday': 2, 'wednesday': 3, 
      'thursday': 4, 'friday': 5, 'saturday': 6, 'sunday': 0
    };

    const now = new Date();
    const nextDate = new Date();

    switch (frequency) {
      case 'daily':
        nextDate.setDate(now.getDate() + 1);
        break;
      case 'weekly':
        const targetDay = days[deliveryDay];
        nextDate.setDate(now.getDate() + 
          ((targetDay + 7 - now.getDay()) % 7 || 7)
        );
        break;
      case 'monthly':
        nextDate.setMonth(now.getMonth() + 1);
        break;
      default:
        throw new Error('Invalid subscription frequency');
    }

    return nextDate;
  }

  // Get User Subscriptions
  async getUserSubscriptions(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        status = 'active' 
      } = req.query;

      const subscriptions = await Subscription.find({ 
        user: req.user.userId,
        status 
      })
      .populate('product')
      .sort({ nextDeliveryDate: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

      const total = await Subscription.countDocuments({ 
        user: req.user.userId,
        status 
      });

      res.json({
        subscriptions,
        totalPages: Math.ceil(total / limit),
        currentPage: page
      });
    } catch (error) {
      res.status(500).json({ 
        message: 'Error fetching subscriptions',
        error: error.message 
      });
    }
  }

  // Update Subscription
  async updateSubscription(req, res) {
    try {
      const { subscriptionId } = req.params;
      const { 
        quantity, 
        frequency, 
        deliveryDay,
        status 
      } = req.body;

      const subscription = await Subscription.findOne({
        _id: subscriptionId,
        user: req.user.userId
      });

      if (!subscription) {
        return res.status(404).json({ 
          message: 'Subscription not found' 
        });
      }

      // Update fields
      if (quantity) subscription.quantity = quantity;
      if (frequency) subscription.frequency = frequency;
      if (deliveryDay) subscription.deliveryDay = deliveryDay;
      if (status) subscription.status = status;

      // Recalculate next delivery date
      subscription.nextDeliveryDate = this.calculateNextDeliveryDate(
        frequency || subscription.frequency,
        deliveryDay || subscription.deliveryDay
      );

      await subscription.save();

      res.json({
        message: 'Subscription updated successfully',
        subscription
      });
    } catch (error) {
      res.status(500).json({ 
        message: 'Error updating subscription',
        error: error.message 
      });
    }
  }

  // Cancel Subscription
  async cancelSubscription(req, res) {
    try {
      const { subscriptionId } = req.params;

      const subscription = await Subscription.findOneAndUpdate(
        {
          _id: subscriptionId,
          user: req.user.userId
        },
        { 
          status: 'cancelled',
          cancelledAt: new Date() 
        },
        { new: true }
      );

      if (!subscription) {
        return res.status(404).json({ 
          message: 'Subscription not found' 
        });
      }

      res.json({
        message: 'Subscription cancelled successfully',
        subscription
      });
    } catch (error) {
      res.status(500).json({ 
        message: 'Error cancelling subscription',
        error: error.message 
      });
    }
  }
}

module.exports = new SubscriptionController();