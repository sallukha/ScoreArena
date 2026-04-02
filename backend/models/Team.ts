import mongoose, { Schema, model } from 'mongoose';

const TeamSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    logo: { type: String, default: '' },
    players: { type: [String], default: [] },
    captainId: { type: String, default: '' },
    createdBy: { type: String, required: true },
  },
  { timestamps: true, versionKey: false }
);

TeamSchema.index({ createdBy: 1, createdAt: -1 });
TeamSchema.index({ players: 1 });

export const TeamModel = mongoose.models.Team || model('Team', TeamSchema);
