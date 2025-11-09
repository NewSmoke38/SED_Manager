import mongoose from 'mongoose';

const deviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    host: {
      type: String,
      required: true,
      trim: true
    },
    port: {
      type: Number,
      required: true,
      min: 1,
      max: 65535
    },
    username: {
      type: String,
      required: true,
      trim: true
    },
    password: {
      type: String,
      required: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    lastSeen: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: ['online', 'offline', 'unknown'],
      default: 'unknown'
    }
  },
  {
    timestamps: true,
    autoIndex: true 
  }
);

// Note: Only indexes defined here will be kept
deviceSchema.index({ host: 1, port: 1 }, { unique: false });

// Clear any existing models to prevent caching issues
if (mongoose.models.Device) {
  delete mongoose.models.Device;
}

const Device = mongoose.model('Device', deviceSchema);

export default Device;

