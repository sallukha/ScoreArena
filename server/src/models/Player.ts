import mongoose, { Schema, model, Model, Document } from 'mongoose';

export interface IPlayer extends Document {
  name: string;
  phone?: string;
  phoneNumber?: string;
  email?: string;
  password?: string;
  role?: string;
  battingStyle?: string;
  bowlingStyle?: string;
  createdBy?: string;
  scope?: string;
  tournamentId?: string;
  stats?: Record<string, any>;
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
    phoneNumber: {
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
    role: { type: String, default: 'All-rounder' },
    battingStyle: { type: String, default: 'Right Hand Bat' },
    bowlingStyle: { type: String, default: 'Right Arm Fast' },
    createdBy: { type: String, default: '' },
    scope: { type: String, enum: ['general', 'tournament'], default: 'general' },
    tournamentId: { type: String, default: '' },
    stats: {
      type: Schema.Types.Mixed,
      default: () => ({
        matches: 0,
        runs: 0,
        wickets: 0,
        fours: 0,
        sixes: 0,
        fifties: 0,
        centuries: 0,
        balls: 0,
        ballsBowled: 0,
        runsConceded: 0,
        average: 0,
        strikeRate: 0,
        economy: 0,
        highestScore: 0,
        bestBowling: '0/0',
      }),
    },
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
  if (this.phone && !this.phoneNumber) {
    this.phoneNumber = this.phone;
  }

  if (this.phoneNumber && !this.phone) {
    this.phone = this.phoneNumber;
  }

  if (this.phone && !/^\+?\d{10,15}$/.test(String(this.phone))) {
    this.invalidate('phone', 'Invalid phone number');
  }

  if (this.phoneNumber && !/^\+?\d{10,15}$/.test(String(this.phoneNumber))) {
    this.invalidate('phoneNumber', 'Invalid phone number');
  }

  next();
});

PlayerSchema.index({ phone: 1 }, { unique: true, sparse: true });
PlayerSchema.index({ phoneNumber: 1 }, { unique: true, sparse: true });
PlayerSchema.index({ email: 1 }, { unique: true, sparse: true });
PlayerSchema.index({ createdBy: 1, createdAt: -1 });
PlayerSchema.index({ 'stats.runs': -1 });
PlayerSchema.index({ name: 1, createdAt: -1 });
PlayerSchema.index({ createdAt: -1 });

const PlayerModel = (mongoose.models.Player as Model<IPlayer>) || model<IPlayer>('Player', PlayerSchema);
export default PlayerModel;
