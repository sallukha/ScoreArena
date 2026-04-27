import mongoose, { Schema, model, Model } from 'mongoose';

const UserSchema = new Schema(
  {
    _id: { type: String, required: true },
    uid: { type: String, required: true },
    displayName: { type: String, required: true },
    email: { type: String, default: '' },
    phoneNumber: { type: String, default: '' },
    photoURL: { type: String, default: '' },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    googleId: { type: String, default: '' },
    authProvider: { type: String, enum: ['google', 'phone'], default: 'google' },
  },
  { timestamps: true, versionKey: false }
);

UserSchema.index({ email: 1 });
UserSchema.index({ phoneNumber: 1 });

export const UserModel: Model<any> = (mongoose.models.User as Model<any>) || model<any>('User', UserSchema);
