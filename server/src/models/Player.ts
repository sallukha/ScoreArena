import mongoose, { Schema, model } from 'mongoose';

const PlayerSchema = new Schema(
  {
    name: { type: String, trim: true, default: '' },
    phone: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      default: null,
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
      default: null,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address'],
    },
    password: { type: String, default: null },
    matchesPlayed: { type: Number, default: 0 },
    totalRuns: { type: Number, default: 0 },
    totalWickets: { type: Number, default: 0 },
    teams: [{ type: Schema.Types.ObjectId, ref: 'Team' }],
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true, versionKey: false }
);

// Custom validation: at least one of phone or email must exist
PlayerSchema.pre('validate', function (next) {
  if (!this.phone && !this.email) {
    this.invalidate('phone', 'Either phone or email is required.');
    this.invalidate('email', 'Either phone or email is required.');
  }

  if (this.phone && !/^\+?\d{10,15}$/.test(String(this.phone))) {
    this.invalidate('phone', 'Invalid phone number');
  }

  next();
});

PlayerSchema.index({ phone: 1 }, { unique: true, sparse: true });
PlayerSchema.index({ email: 1 }, { unique: true, sparse: true });
PlayerSchema.index({ name: 1, createdAt: -1 });
PlayerSchema.index({ createdAt: -1 });

export const PlayerModel = mongoose.models.Player || model('Player', PlayerSchema);
