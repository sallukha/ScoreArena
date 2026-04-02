import mongoose, { Schema, model } from 'mongoose';

const BallSchema = new Schema(
  {
    matchId: { type: String, required: true, index: true },
    innings: { type: Number, enum: [1, 2], required: true },
    over: { type: Number, default: 0 },
    ball: { type: Number, default: 0 },
    runs: { type: Number, default: 0 },
    extraType: {
      type: String,
      enum: ['wide', 'no-ball', 'bye', 'leg-bye', 'penalty', ''],
      default: '',
    },
    wicket: { type: Schema.Types.Mixed, default: null },
    batsman: { type: String, default: '' },
    bowler: { type: String, default: '' },
    snapshotBefore: { type: Schema.Types.Mixed, default: null },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true, versionKey: false }
);

BallSchema.index({ matchId: 1, innings: 1, timestamp: -1 });

export const BallModel = mongoose.models.Ball || model('Ball', BallSchema);
