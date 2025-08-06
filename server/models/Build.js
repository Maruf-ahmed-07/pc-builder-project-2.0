const mongoose = require('mongoose');

const buildSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Build name is required'],
    trim: true,
    maxlength: [100, 'Build name cannot exceed 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  components: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  totalPrice: {
    type: Number,
    default: 0
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  tags: [String],
  purpose: {
    type: String,
    enum: ['Gaming', 'Workstation', 'Budget', 'High-End', 'Office', 'Server', 'Other'],
    default: 'Other'
  },
  likes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    comment: {
      type: String,
      required: true,
      maxlength: [500, 'Comment cannot exceed 500 characters']
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  views: {
    type: Number,
    default: 0
  },
  shareUrl: {
    type: String,
    unique: true
  },
  featured: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Generate unique share URL
buildSchema.pre('save', function(next) {
  if (!this.shareUrl) {
    this.shareUrl = `${this._id}-${Date.now()}`;
  }
  next();
});

// Calculate total price from components
buildSchema.methods.calculateTotalPrice = function() {
  let total = 0;
  if (this.components && typeof this.components === 'object') {
    Object.values(this.components).forEach(component => {
      if (component && typeof component === 'object') {
        const price = component.discountPrice || component.price || 0;
        total += price;
      }
    });
  }
  this.totalPrice = total;
  return total;
};

// Check component compatibility
buildSchema.methods.checkCompatibility = function() {
  // Simple compatibility check - can be expanded later
  const componentCount = Object.keys(this.components || {}).length;
  return {
    isCompatible: componentCount > 0,
    message: componentCount > 0 ? 'Components look compatible!' : 'No components selected'
  };
};

buildSchema.index({ user: 1 });
buildSchema.index({ isPublic: 1 });
buildSchema.index({ 'likes.user': 1 });
buildSchema.index({ shareUrl: 1 });

module.exports = mongoose.model('Build', buildSchema);
