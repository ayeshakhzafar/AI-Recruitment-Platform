import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  Box, 
  Button, 
  Card, 
  CardContent, 
  Typography, 
  LinearProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

const API_BASE = 'http://localhost:8000';

const CvUpload = ({ onUploadSuccess, jobPostings = [] }) => {
  const [file, setFile] = useState(null);
  const [jobId, setJobId] = useState('');
  const [fetchedJobs, setFetchedJobs] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  const jobsList = useMemo(
    () => (jobPostings && jobPostings.length > 0 ? jobPostings : fetchedJobs),
    [jobPostings, fetchedJobs]
  );

  useEffect(() => {
    if (jobPostings && jobPostings.length > 0) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/cv/job-postings?status=active`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setFetchedJobs(data.job_postings || []);
      } catch (e) {
        console.error('Failed to load job postings for CV import:', e);
      }
    })();
    return () => { cancelled = true; };
  }, [jobPostings]);

  const selectedJobTitle = useMemo(
    () => jobsList.find((j) => j.job_id === jobId)?.title,
    [jobsList, jobId]
  );

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const allowedTypes = ['.pdf', '.docx', '.doc', '.txt'];
      const fileExtension = selectedFile.name.toLowerCase().slice(selectedFile.name.lastIndexOf('.'));

      if (!allowedTypes.includes(fileExtension)) {
        setError(`Unsupported file type. Allowed: ${allowedTypes.join(', ')}`);
        setFile(null);
        return;
      }

      setFile(selectedFile);
      setError('');
      setSuccess('');
    }
  };

  const handleUpload = async () => {
    if (!jobId) {
      setError("Select a job posting first. Skill match % is calculated against that job's required skills.");
      return;
    }
    if (!file) {
      setError('Please select a file');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('job_id', jobId);
    formData.append('source', 'manual_upload');

    try {
      const response = await axios.post(`${API_BASE}/api/cv/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(percentCompleted);
        },
      });

      setSuccess(
        response.data?.message
          ? `${response.data.message} Match: ${response.data.skill_match_percentage ?? '—'}% vs “${selectedJobTitle || 'job'}”.`
          : 'CV uploaded and processed successfully!'
      );
      setFile(null);
      setUploadProgress(100);

      if (onUploadSuccess) {
        onUploadSuccess(response.data);
      }

      setTimeout(() => {
        setUploadProgress(0);
        setUploading(false);
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed. Please try again.');
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleProcessGmail = async () => {
    if (!jobId) {
      setError('Select a job posting first. Gmail CVs will be matched to that job before they appear in the list.');
      return;
    }
    try {
      setUploading(true);
      setError('');
      setSuccess('');
      const response = await axios.post(`${API_BASE}/api/cv/process-gmail`, {
        job_id: jobId,
        lookback_hours: 24,
      });

      const title = response.data?.job_title || selectedJobTitle;
      setSuccess(
        `${response.data?.message || 'Started.'} Target job: ${title}. Refresh the candidate list in a few seconds.`
      );
    } catch (err) {
      setError(err.response?.data?.detail || 'Gmail processing failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card sx={{ maxWidth: 640, mx: 'auto', mt: 2 }}>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Import CVs
        </Typography>

        <Typography variant="body2" color="text.secondary" paragraph>
          Choose the job you are hiring for first. Uploaded CVs and Gmail attachments are parsed and
          scored against that posting’s required skills so the match % reflects that role.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Box sx={{ mb: 2 }}>
          <FormControl fullWidth required sx={{ mb: 2 }}>
            <InputLabel id="cv-job-select-label" shrink>
              Job posting
            </InputLabel>
            <Select
              labelId="cv-job-select-label"
              value={jobId}
              label="Job posting"
              notched
              displayEmpty
              renderValue={(selected) => {
                if (!selected) {
                  return (
                    <Box component="span" sx={{ color: 'text.secondary' }}>
                      Select a job title…
                    </Box>
                  );
                }
                return jobsList.find((j) => j.job_id === selected)?.title || selected;
              }}
              onChange={(e) => {
                setJobId(e.target.value);
                setError('');
                setSuccess('');
              }}
            >
              {/* Hidden sentinel so value="" stays valid for MUI without duplicating label text in-field */}
              <MenuItem value="" sx={{ display: 'none' }}>
                —
              </MenuItem>
              {jobsList.map((job) => (
                <MenuItem key={job.job_id} value={job.job_id}>
                  {job.title}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {jobId && selectedJobTitle && (
            <Alert severity="info" sx={{ mb: 2 }}>
              CVs you import now will be matched against: <strong>{selectedJobTitle}</strong>
            </Alert>
          )}

          {!jobsList.length && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              No active job postings found. Create one under Job Posting, then return here.
            </Alert>
          )}
        </Box>

        <Box sx={{ mb: 2 }}>
          <input
            accept=".pdf,.docx,.doc,.txt"
            style={{ display: 'none' }}
            id="cv-file-upload"
            type="file"
            onChange={handleFileChange}
          />
          <label htmlFor="cv-file-upload">
            <Button
              variant="outlined"
              component="span"
              fullWidth
              startIcon={<CloudUploadIcon />}
            >
              Select CV file
            </Button>
          </label>

          {file && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
            </Typography>
          )}
        </Box>

        {uploading && (
          <Box sx={{ width: '100%', mb: 2 }}>
            <LinearProgress variant="determinate" value={uploadProgress} />
            <Typography variant="caption" display="block" align="center">
              {uploadProgress}% complete
            </Typography>
          </Box>
        )}

        <Button
          variant="contained"
          onClick={handleUpload}
          disabled={!file || !jobId || uploading || !jobsList.length}
          fullWidth
          sx={{ mb: 2 }}
        >
          {uploading ? 'Processing…' : 'Upload & process CV'}
        </Button>

        <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 2 }}>
          or
        </Typography>

        <Button
          variant="outlined"
          onClick={handleProcessGmail}
          disabled={!jobId || uploading || !jobsList.length}
          fullWidth
          color="secondary"
        >
          Process CVs from Gmail (last 24h)
        </Button>

        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>
          Formats: PDF, DOCX, DOC, TXT. Scanned PDFs may use OCR. Gmail requires backend token/credentials.
        </Typography>
      </CardContent>
    </Card>
  );
};

export default CvUpload;
