import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface UserProfile {
  uid: string;
  email: string;
  age: number;
  weight: number;
  height: number;
  goal: 'lose' | 'maintain' | 'gain';
  activity: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  gymLevel: 'beginner' | 'intermediate' | 'advanced';
  xp: number;
  level: number;
  streak: number;
  dailyCaloriesTarget: number;
  dailyProteinTarget: number;
  onboarded: boolean;
}

export interface Meal {
  id: string;
  userId: string;
  timestamp: any;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sodium: number;
  imageUrl?: string;
}

export interface WorkoutPlan {
  id: string;
  userId: string;
  planName: string;
  exercises: {
    name: string;
    sets: string;
    reps: string;
    description: string;
    imageURL: string;
    completed?: boolean;
  }[];
  createdAt: any;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  deadline: string;
  tags: string[];
  status: 'todo' | 'in_progress' | 'done';
  isWorkoutTask?: boolean;
}

export interface TrackingLog {
  id: string;
  userId: string;
  date: string;
  weight?: number;
  waterIntake: number; // in ml
  steps: number;
}
