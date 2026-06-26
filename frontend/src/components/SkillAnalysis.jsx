import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Equalizer as EqualizerIcon,
  Star as StarIcon,
  Warning as WarningIcon
} from '@mui/icons-material';

const SkillAnalysis = () => {
  const [jobPostings, setJobPostings] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchJobPostings();
  }, []);

  const fetchJobPostings = async () => {
    try {
      const response = await axios.get('/api/cv/job-postings');
      setJobPostings(response.data.job_postings);
      if (response.data.job_postings.length > 0) {
        setSelectedJobId(response.data.job_postings[0].job_id);
      }
    } catch (error) {
      console.error('Error fetching job postings:', error);
    }
  };

  useEffect(() => {
    if (selectedJobId) {
      fetchSkillAnalysis(selectedJobId);
    }
  }, [selectedJobId]);

  const fetchSkillAnalysis = async (jobId) => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/cv/skill-analysis/${jobId}`);
      setAnalysisData(response.data);
    } catch (error) {
      console.error('Error fetching skill analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMatchColor = (percentage) => {
    if (percentage >= 80) return '#4caf50';
    if (percentage >= 60) return '#ff9800';
    return '#f44336';
  };

  if (loading) {
    return (
      <Box sx={{ width: '100%', p: 4 }}>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Skill Gap Analysis
          </Typography>
          
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Select Job Position</InputLabel>
            <Select
              value={selectedJobId}
              label="Select Job Position"
              onChange={(e) => setSelectedJobId(e.target.value)}
            >
              {jobPostings.map((job) => (
                <MenuItem key={job.job_id} value={job.job_id}>
                  {job.title}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </CardContent>
      </Card>

      {analysisData && (
        <>
          {/* Summary Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Total Candidates
                  </Typography>
                  <Typography variant="h4">
                    {analysisData.statistics.total_candidates}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Average Match
                  </Typography>
                  <Typography variant="h4" style={{ color: getMatchColor(analysisData.statistics.average_match_percentage) }}>
                    {analysisData.statistics.average_match_percentage}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Top Candidate
                  </Typography>
                  <Typography variant="h6">
                    {analysisData.statistics.top_candidates[0]?.name || 'N/A'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {analysisData.statistics.top_candidates[0]?.skill_match_percentage || 0}% match
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Common Skills
                  </Typography>
                  <Typography variant="h4">
                    {Object.keys(analysisData.statistics.skill_frequency).length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            {/* Top Candidates */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    <StarIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Top 5 Candidates
                  </Typography>
                  
                  <List>
                    {analysisData.statistics.top_candidates.map((candidate, index) => (
                      <ListItem key={index} divider={index < 4}>
                        <ListItemIcon>
                          {index === 0 ? (
                            <StarIcon color="warning" />
                          ) : (
                            <Typography variant="h6" color="text.secondary">
                              {index + 1}
                            </Typography>
                          )}
                        </ListItemIcon>
                        <ListItemText
                          primary={candidate.name || candidate.email}
                          secondary={`${candidate.skill_match_percentage}% match | ${candidate.skills?.length || 0} skills`}
                        />
                        <Chip
                          label={`${candidate.skill_match_percentage}%`}
                          style={{ backgroundColor: getMatchColor(candidate.skill_match_percentage), color: 'white' }}
                          size="small"
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>

            {/* Skill Frequency */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    <EqualizerIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Most Common Skills
                  </Typography>
                  
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Skill</TableCell>
                          <TableCell align="right">Candidates</TableCell>
                          <TableCell align="right">Frequency</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {Object.entries(analysisData.statistics.skill_frequency)
                          .map(([skill, count]) => (
                            <TableRow key={skill}>
                              <TableCell>{skill}</TableCell>
                              <TableCell align="right">{count}</TableCell>
                              <TableCell align="right">
                                <LinearProgress 
                                  variant="determinate" 
                                  value={(count / analysisData.statistics.total_candidates) * 100} 
                                  sx={{ minWidth: 100 }}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Missing Skills */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    <WarningIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'error.main' }} />
                    Common Missing Skills
                  </Typography>
                  
                  {Object.keys(analysisData.statistics.common_missing_skills).length > 0 ? (
                    <List>
                      {Object.entries(analysisData.statistics.common_missing_skills)
                        .map(([skill, count]) => (
                          <ListItem key={skill} divider>
                            <ListItemIcon>
                              <ErrorIcon color="error" />
                            </ListItemIcon>
                            <ListItemText
                              primary={skill}
                              secondary={`Missing in ${count} candidates`}
                            />
                            <Typography variant="body2" color="error">
                              {Math.round((count / analysisData.statistics.total_candidates) * 100)}%
                            </Typography>
                          </ListItem>
                        ))}
                    </List>
                  ) : (
                    <Alert severity="success">
                      No common missing skills found!
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Extra Skills */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    <TrendingUpIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'success.main' }} />
                    Common Extra Skills
                  </Typography>
                  
                  {Object.keys(analysisData.statistics.common_extra_skills).length > 0 ? (
                    <List>
                      {Object.entries(analysisData.statistics.common_extra_skills)
                        .map(([skill, count]) => (
                          <ListItem key={skill} divider>
                            <ListItemIcon>
                              <CheckCircleIcon color="success" />
                            </ListItemIcon>
                            <ListItemText
                              primary={skill}
                              secondary={`Extra skill in ${count} candidates`}
                            />
                            <Typography variant="body2" color="success">
                              {Math.round((count / analysisData.statistics.total_candidates) * 100)}%
                            </Typography>
                          </ListItem>
                        ))}
                    </List>
                  ) : (
                    <Alert severity="info">
                      No common extra skills found
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Job Requirements */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Job Requirements
                  </Typography>
                  
                  <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      {analysisData.job.title}
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {analysisData.job.description || 'No description provided'}
                    </Typography>
                    
                    <Typography variant="subtitle2" gutterBottom>
                      Required Skills:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {analysisData.job.required_skills.map((skill, index) => (
                        <Chip
                          key={index}
                          label={skill}
                          color="primary"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                    
                    {analysisData.job.experience_level && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Experience Level:
                        </Typography>
                        <Chip
                          label={analysisData.job.experience_level}
                          size="small"
                        />
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}

      {!analysisData && selectedJobId && (
        <Alert severity="info">
          No analysis data available for this job position
        </Alert>
      )}
    </Box>
  );
};

export default SkillAnalysis;