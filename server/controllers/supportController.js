const SupportRequest = require('../models/SupportRequest');

exports.submitSupportRequest = async (req, res) => {
  try {
    const { name, email, orderNumber, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, Email and Message are required.' });
    }

    const newRequest = new SupportRequest({ name, email, orderNumber, message });
    await newRequest.save();

    return res.status(201).json({ message: 'Support request submitted successfully.' });
  } catch (error) {
    console.error('Error submitting support request:', error);
    return res.status(500).json({ error: 'Server error. Please try again later.' });
  }
};
