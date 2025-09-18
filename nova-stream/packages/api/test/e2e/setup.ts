import 'reflect-metadata';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from the project root for testing
// The path is relative to the location of this setup file
config({ path: resolve(__dirname, '../../.env.example') });
