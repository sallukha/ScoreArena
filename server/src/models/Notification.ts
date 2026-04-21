import mongoose, { Schema, model } from 'mongoose';

const NotificationSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    title: { type: String, default: '' },
    message: { type: String, default: '' },
    matchId: { type: String, default: '' },
    read: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true, versionKey: false }
);

NotificationSchema.index({ userId: 1, timestamp: -1 });

export const NotificationModel =mongoose.models.Notification || model('Notification', NotificationSchema);

   