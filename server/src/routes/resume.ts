import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { config } from '../config';
import { dataStore } from '../services/dataStore';
import { createId } from '../utils/types';

import { uploadLimiter } from '../middleware/rateLimiter';

const router = Router();

// Configure multer with safe disk storage
const uploadsDir = path.resolve(config.upload.uploadDir);
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (_req, file, cb) => {
    // Sanitize original filename and strip path traversal characters
    const sanitized = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `resume_${Date.now()}_${sanitized}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: config.upload.maxSize },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.pdf' || ext === '.docx') {
      cb(null, true);
    } else {
      cb(new Error('Only authentic PDF and DOCX files are allowed'));
    }
  },
});

// POST /api/resume/upload
router.post('/upload', uploadLimiter, upload.single('resume'), async (req: Request, res: Response): Promise<void> => {
  let filePath: string | null = null;
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    filePath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();
    const buffer = fs.readFileSync(filePath);

    // Magic Bytes Verification
    if (ext === '.pdf') {
      const magic = buffer.subarray(0, 5).toString('ascii');
      if (!magic.startsWith('%PDF')) {
        res.status(422).json({ error: 'Security validation failed: File has .pdf extension but does not contain valid PDF signature.' });
        return;
      }
    } else if (ext === '.docx') {
      // DOCX is a ZIP container: 0x50 0x4B 0x03 0x04
      if (buffer[0] !== 0x50 || buffer[1] !== 0x4b || buffer[2] !== 0x03 || buffer[3] !== 0x04) {
        res.status(422).json({ error: 'Security validation failed: File has .docx extension but does not contain valid DOCX/ZIP signature.' });
        return;
      }
    }

    let extractedText = '';
    try {
      if (ext === '.pdf') {
        const pdfParse = require('pdf-parse');
        const data = await pdfParse(buffer);
        extractedText = data.text || '';
      } else if (ext === '.docx') {
        const mammoth = require('mammoth');
        const result = await mammoth.extractRawText({ path: filePath });
        extractedText = result.value || '';
      }
    } catch (parseError: any) {
      console.error('Parse error:', parseError);
      res.status(422).json({ error: `Failed to parse document: ${parseError.message}` });
      return;
    }

    if (!extractedText || extractedText.trim().length < 50) {
      res.status(422).json({
        error: 'Could not extract meaningful text from the file. Please ensure the document is not an empty or scanned image document.',
      });
      return;
    }

    const resumeData = {
      id: createId(),
      filename: path.basename(req.file.originalname),
      extractedText: extractedText.substring(0, 15000),
      uploadedAt: new Date().toISOString(),
      skills: [],
      summary: extractedText.substring(0, 500),
    };

    // Store resume and build candidate profile
    const profile = dataStore.setResume(resumeData);

    // Auto-analyze jobs against new profile
    await dataStore.analyzeAllJobs().catch(() => {});

    res.json({
      success: true,
      message: 'Resume successfully analyzed & universal profile generated ✅',
      resume: {
        id: resumeData.id,
        filename: resumeData.filename,
        uploadedAt: resumeData.uploadedAt,
        skills: profile.demonstratedSkills,
        textLength: extractedText.length,
      },
      profile,
    });
  } catch (error: any) {
    console.error('Resume upload error:', error);
    res.status(500).json({ error: `Upload failed: ${error.message}` });
  } finally {
    // Clean up uploaded file immediately (text has been extracted safely)
    if (filePath && fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch {}
    }
  }
});

// GET /api/resume
router.get('/', (_req: Request, res: Response): void => {
  const resume = dataStore.getResume();
  const profile = dataStore.getProfile();
  if (!resume) {
    res.json({ hasResume: false });
    return;
  }

  res.json({
    hasResume: true,
    resume: {
      id: resume.id,
      filename: resume.filename,
      uploadedAt: resume.uploadedAt,
      skills: profile?.demonstratedSkills || resume.skills,
      summary: resume.summary,
    },
    profile,
  });
});

// GET /api/resume/profile - Get structured editable candidate profile
router.get('/profile', (_req: Request, res: Response): void => {
  const profile = dataStore.getProfile();
  if (!profile) {
    res.status(404).json({ error: 'No profile found. Please upload a resume first.' });
    return;
  }
  res.json({ success: true, profile });
});

// PUT /api/resume/profile - Edit extracted profile preferences & recalculate recommendations
router.put('/profile', async (req: Request, res: Response): Promise<void> => {
  try {
    const updates = req.body;
    const updatedProfile = dataStore.updateProfile(updates);

    // Recalculate match recommendations on preference change
    await dataStore.analyzeAllJobs().catch(() => {});

    res.json({
      success: true,
      message: 'Profile preferences updated and recommendations recalculated.',
      profile: updatedProfile,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/resume
router.delete('/', (_req: Request, res: Response): void => {
  dataStore.setResume(null as any);
  res.json({ success: true, message: 'Resume and candidate profile removed.' });
});

export default router;
