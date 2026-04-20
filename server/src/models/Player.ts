import mongoose, { Schema, model, Model, Document } from 'mongoose';

export interface IPlayer extends Document {
  name: string;
  phone?: string;
  email?: string;
  password?: string;
  matchesPlayed: number;
  totalRuns: number;
  totalWickets: number;
  teams: mongoose.Types.ObjectId[];
  createdAt: Date;
}

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
PlayerSchema.pre('validate', function (this: any, next: (err?: Error) => void) {
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

const PlayerModel = (mongoose.models.Player as Model<IPlayer>) || model<IPlayer>('Player', PlayerSchema);
export default PlayerModel;
