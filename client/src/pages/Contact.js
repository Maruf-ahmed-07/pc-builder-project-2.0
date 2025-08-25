import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import './Contact.css';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    category: 'General Inquiry',
    priority: 'Medium'
  });
  const [ticketInfo, setTicketInfo] = useState(null);

  // Contact form submission mutation
  const contactMutation = useMutation({
    mutationFn: async (data) => {
      const response = await axios.post('/api/contact', data);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success('Support ticket created!');
      setTicketInfo(data.ticket);
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: '',
        category: 'General Inquiry',
        priority: 'Medium'
      });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to submit ticket. Please try again.');
    }
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Basic validation
  if (!formData.name.trim() || !formData.email.trim() || !formData.subject.trim() || !formData.message.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    contactMutation.mutate(formData);
  };

  return (
    <div className="container">
      <div className="contact-page">
        <div className="page-header">
          <h1>Contact Us</h1>
          <p>Get in touch with our team. We're here to help!</p>
        </div>

        <div className="contact-content">
          {/* Contact Information */}
          <div className="contact-info">
            <div className="info-card">
              <div className="info-icon">📧</div>
              <h3>Email Support</h3>
              <p>Get help via email</p>
              <a href="mailto:support@pcbuilder.com">support@pcbuilder.com</a>
            </div>

            <div className="info-card">
              <div className="info-icon">💬</div>
              <h3>Live Chat</h3>
              <p>Chat with our support team</p>
              <span>Available 24/7</span>
            </div>

            <div className="info-card">
              <div className="info-icon">📞</div>
              <h3>Phone Support</h3>
              <p>Call us for immediate assistance</p>
              <a href="tel:+1-800-123-4567">+1 (800) 123-4567</a>
            </div>

            <div className="info-card">
              <div className="info-icon">❓</div>
              <h3>FAQ</h3>
              <p>Find answers to common questions</p>
              <a href="#faq">View FAQ Section</a>
            </div>
          </div>

          {/* Contact Form */}
          <div className="contact-form-section">
            <div className="form-header">
              <h2>Send us a Message</h2>
              <p>Fill out the form below and we'll get back to you as soon as possible.</p>
            </div>

            <form onSubmit={handleSubmit} className="contact-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="name">Full Name *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email Address *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter your email address"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="category">Category</label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                  >
                    <option value="General Inquiry">General Inquiry</option>
                    <option value="Technical Support">Technical Support</option>
                    <option value="Order Support">Order Support</option>
                    <option value="Product Question">Product Question</option>
                    <option value="Feedback">Feedback</option>
                    <option value="Complaint">Complaint</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="priority">Priority</label>
                  <select
                    id="priority"
                    name="priority"
                    value={formData.priority}
                    onChange={handleChange}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="subject">Subject *</label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  placeholder="Brief description of your inquiry"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="message">Message *</label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Please provide details about your inquiry..."
                  rows="6"
                  required
                ></textarea>
              </div>

              {ticketInfo && (
                <div className="ticket-confirmation">
                  <strong>Ticket ID:</strong> {ticketInfo.id} &nbsp;|&nbsp; Status: {ticketInfo.status} &nbsp;|&nbsp; Priority: {ticketInfo.priority}
                </div>
              )}
              <div className="form-footer">
                <p className="privacy-note">
                  By submitting this form, you agree to our privacy policy and terms of service.
                </p>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={contactMutation.isLoading}
                >
                  {contactMutation.isLoading ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* FAQ Section */}
        <div id="faq" className="faq-section">
          <h2>Frequently Asked Questions</h2>
          <div className="faq-grid">
            <div className="faq-item">
              <h3>How do I track my order?</h3>
              <p>You can track your order by logging into your account and visiting the "Orders" section. You'll receive email updates as your order status changes.</p>
            </div>

            <div className="faq-item">
              <h3>What's your return policy?</h3>
              <p>We offer a 30-day return policy for most items. Products must be in original condition with all accessories and packaging.</p>
            </div>

            <div className="faq-item">
              <h3>Do you offer PC building services?</h3>
              <p>Yes! We offer professional PC building services. You can select this option during checkout or contact us for a custom quote.</p>
            </div>

            <div className="faq-item">
              <h3>How do I cancel or modify my order?</h3>
              <p>Orders can be cancelled or modified within 1 hour of placement. After that, please contact our support team for assistance.</p>
            </div>

            <div className="faq-item">
              <h3>What payment methods do you accept?</h3>
              <p>We accept all major credit cards, PayPal, and cash on delivery. All payments are processed securely.</p>
            </div>

            <div className="faq-item">
              <h3>Do you offer warranty on products?</h3>
              <p>Yes, all products come with manufacturer warranty. We also offer extended warranty options for additional protection.</p>
            </div>
          </div>
        </div>

        {/* Additional Support */}
        <div className="additional-support">
          <h2>Other Ways to Get Help</h2>
          <div className="support-options">
            <div className="support-option">
              <h3>📚 Knowledge Base</h3>
              <p>Browse our comprehensive guides and tutorials</p>
              <button className="btn btn-outline-primary">Visit Knowledge Base</button>
            </div>

            <div className="support-option">
              <h3>👥 Community Forum</h3>
              <p>Get help from other PC builders and enthusiasts</p>
              <button className="btn btn-outline-primary">Join Community</button>
            </div>

            <div className="support-option">
              <h3>🎥 Video Tutorials</h3>
              <p>Watch step-by-step PC building guides</p>
              <button className="btn btn-outline-primary">Watch Videos</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
