const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // end-user owning the thread
  sender: { type: String, enum: ['user', 'admin', 'system'], required: true },
  message: { type: String, required: true, trim: true },
  readByUser: { type: Boolean, default: false },
  readByAdmin: { type: Boolean, default: false },
  meta: {
    type: Object,
    default: {}
  }
}, { timestamps: true });

// Index for faster lookups by user
chatMessageSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
