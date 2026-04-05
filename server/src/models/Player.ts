import mongoose, { Schema, model } from 'mongoose';

const PlayerSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, default: null },
    phoneNumber: { type: String, default: null },
    role: {
      type: String,
      enum: ['Batsman', 'Bowler', 'All-rounder', 'Wicket-keeper'],
      default: 'Batsman',
    },
    battingStyle: { type: String, default: '' },
    bowlingStyle: { type: String, default: '' },
    createdBy: { type: String, required: true },
    stats: {
      type: {
        matches: { type: Number, default: 0 },
        runs: { type: Number, default: 0 },
        wickets: { type: Number, default: 0 },
        highestScore: { type: Number, default: 0 },
        bestBowling: { type: String, default: '' },
        average: { type: Number, default: 0 },
        strikeRate: { type: Number, default: 0 },
        economy: { type: Number, default: 0 },
        fours: { type: Number, default: 0 },
        sixes: { type: Number, default: 0 },
        fifties: { type: Number, default: 0 },
        centuries: { type: Number, default: 0 },
        balls: { type: Number, default: 0 },
        ballsBowled: { type: Number, default: 0 },
        runsConceded: { type: Number, default: 0 },
      },
      default: () => ({}),
    },
  },
  { timestamps: true, versionKey: false }
);

PlayerSchema.index({ createdBy: 1, createdAt: -1 });
PlayerSchema.index({ phoneNumber: 1 });
PlayerSchema.index({ email: 1 });
PlayerSchema.index({ createdBy: 1, name: 1 });

export const PlayerModel = mongoose.models.Player || model('Player', PlayerSchema);
