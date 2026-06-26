import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  LinearProgress,
  Tooltip,
  Badge
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon,
  Email as EmailIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Visibility as ViewIcon,
  Person as PersonIcon,
  Work as WorkIcon,
  School as SchoolIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const CvDashboard = () => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [jobFilter, setJobFilter] = useState('all');
  const [jobPostings, setJobPostings] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [stats, setStats] = useState({ total: 0, processed: 0, pending: 0, avgMatch: 0 });
  const [selectedIds, setSelectedIds] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCandidates();
    fetchJobPostings();
  }, []);

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/cv/candidates');
      setCandidates(response.data.candidates);
      calculateStats(response.data.candidates);
    } catch (error) {
      console.error('Error fetching candidates:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchJobPostings = async () => {
    try {
      const response = await axios.get('/api/cv/job-postings');
      setJobPostings(response.data.job_postings);
    } catch (error) {
      console.error('Error fetching job postings:', error);
    }
  };

  const calculateStats = (candidatesData) => {
    const total = candidatesData.length;
    const processed = candidatesData.filter(c => c.status === 'processed').length;
    const pending = candidatesData.filter(c => c.status === 'pending').length;
    const avgMatch = candidatesData.length > 0 
      ? candidatesData.reduce((sum, c) => sum + (c.skill_match_percentage || 0), 0) / candidatesData.length
      : 0;

    setStats({ total, processed, pending, avgMatch: Math.round(avgMatch) });
  };

  const handleViewDetails = async (candidateId) => {
    const id = candidateId != null && candidateId !== "" ? String(candidateId).trim() : "";
    if (!id) {
      console.warn("handleViewDetails: missing candidate_id");
      return;
    }
    try {
      const response = await axios.get(`/api/cv/candidate/${encodeURIComponent(id)}`);
      setSelectedCandidate(response.data.candidate);
      setDetailDialogOpen(true);
    } catch (error) {
      console.error('Error fetching candidate details:', error);
    }
  };

  const handleNotifyHR = async (candidateId) => {
    const id = candidateId != null && candidateId !== "" ? String(candidateId).trim() : "";
    if (!id) return;
    try {
      await axios.post(`/api/cv/notify-hr/${encodeURIComponent(id)}`);
      alert('HR manager notified successfully!');
    } catch (error) {
      console.error('Error notifying HR:', error);
      alert('Failed to notify HR manager');
    }
  };

  const handleDelete = async (candidateId) => {
    const id = candidateId != null && candidateId !== "" ? String(candidateId).trim() : "";
    if (!id) return;
    if (!window.confirm('Are you sure you want to delete this candidate?')) return;
    try {
      await axios.delete(`/api/cv/candidate/${encodeURIComponent(id)}`);
      alert('Candidate deleted successfully!');
      fetchCandidates(); // Refresh the list
    } catch (error) {
      console.error('Error deleting candidate:', error);
      alert('Failed to delete candidate');
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedIds.length} selected candidates?`)) return;
    try {
      for (const id of selectedIds) {
        const cid = id != null && id !== '' ? String(id).trim() : '';
        if (!cid) continue;
        await axios.delete(`/api/cv/candidate/${encodeURIComponent(cid)}`);
      }
      alert(`${selectedIds.length} candidates deleted!`);
      setSelectedIds([]);
      fetchCandidates();
    } catch (error) {
      console.error('Error deleting candidates:', error);
      alert('Failed to delete some candidates');
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('Delete ALL candidates? This cannot be undone!')) return;
    try {
      for (const c of candidates) {
        await axios.delete(`/api/cv/candidate/${c.candidate_id}`);
      }
      alert('All candidates deleted!');
      fetchCandidates();
    } catch (error) {
      console.error('Error deleting all candidates:', error);
      alert('Failed to delete all candidates');
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredCandidates.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredCandidates.map(c => c.candidate_id));
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const filteredCandidates = candidates.filter(candidate => {
    const matchesSearch = 
      candidate.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.skills?.some(skill => 
        skill.toLowerCase().includes(searchTerm.toLowerCase())
      );

    const matchesStatus = statusFilter === 'all' || candidate.status === statusFilter;
    const matchesJob = jobFilter === 'all' || candidate.job_id === jobFilter;

    return matchesSearch && matchesStatus && matchesJob;
  });

  const getStatusChip = (status) => {
    switch(status) {
      case 'processed':
        return <Chip label="Processed" color="success" size="small" icon={<CheckCircleIcon />} />;
      case 'pending':
        return <Chip label="Pending" color="warning" size="small" />;
      case 'error':
        return <Chip label="Error" color="error" size="small" icon={<ErrorIcon />} />;
      default:
        return <Chip label={status} size="small" />;
    }
  };

  const getMatchColor = (percentage) => {
    if (percentage >= 80) return 'success';
    if (percentage >= 60) return 'warning';
    return 'error';
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
      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Candidates
              </Typography>
              <Typography variant="h4">
                {stats.total}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Processed
              </Typography>
              <Typography variant="h4" color="success.main">
                {stats.processed}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Pending
              </Typography>
              <Typography variant="h4" color="warning.main">
                {stats.pending}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Avg Match %
              </Typography>
              <Typography variant="h4" color="primary.main">
                {stats.avgMatch}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Pipeline Link */}
      <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <CardContent sx={{ py: 2 }}>
          <Grid container spacing={2} alignItems="center" justifyContent="space-between">
            <Grid item>
              <Typography variant="h6">
                🎯 View Complete Candidate Pipeline
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Track candidates across all stages - CV → Assessment → Coding → Interview → Recommendation
              </Typography>
            </Grid>
            <Grid item>
              <Button 
                variant="contained"
                onClick={() => navigate('/hr/pipeline')}
                sx={{ 
                  bgcolor: 'white', 
                  color: '#667eea',
                  fontWeight: 600,
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }
                }}
              >
                Open Pipeline Dashboard →
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search candidates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Grid>
            
            <Grid item xs={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="processed">Processed</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="error">Error</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Job Position</InputLabel>
                <Select
                  value={jobFilter}
                  label="Job Position"
                  onChange={(e) => setJobFilter(e.target.value)}
                >
                  <MenuItem value="all">All Jobs</MenuItem>
                  {jobPostings.map((job) => (
                    <MenuItem key={job.job_id} value={job.job_id}>
                      {job.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={6} md={2}>
              <Button
                fullWidth
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={handleDeleteSelected}
                disabled={selectedIds.length === 0}
              >
                Delete Selected ({selectedIds.length})
              </Button>
            </Grid>
            
            <Grid item xs={6} md={2}>
              <Button
                fullWidth
                variant="contained"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={handleDeleteAll}
              >
                Delete All
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Candidates Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Candidate Applications ({filteredCandidates.length})
          </Typography>
          
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedIds.length === filteredCandidates.length && filteredCandidates.length > 0}
                      indeterminate={selectedIds.length > 0 && selectedIds.length < filteredCandidates.length}
                      onChange={toggleSelectAll}
                    />
                  </TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Skills</TableCell>
                  <TableCell>Job Match</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Source</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              
              <TableBody>
                {filteredCandidates
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((candidate) => (
                    <TableRow key={candidate.candidate_id} hover>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedIds.includes(candidate.candidate_id)}
                          onChange={() => toggleSelectOne(candidate.candidate_id)}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />
                          <Typography>
                            {candidate.name || 'Not Provided'}
                          </Typography>
                        </Box>
                      </TableCell>
                      
                      <TableCell>
                        <Typography variant="body2">
                          {candidate.email}
                        </Typography>
                      </TableCell>
                      
                      <TableCell>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {candidate.skills.slice(0, 3).map((skill, index) => (
                            <Chip
                              key={index}
                              label={skill}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                          {candidate.skills.length > 3 && (
                            <Chip
                              label={`+${candidate.skills.length - 3}`}
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      </TableCell>
                      
                      <TableCell>
                        <Tooltip 
                          title={`Missing: ${candidate.missing_skills?.length || 0} skills | Extra: ${candidate.extra_skills?.length || 0} skills`}
                        >
                          <Chip
                            label={`${candidate.skill_match_percentage || 0}%`}
                            color={getMatchColor(candidate.skill_match_percentage || 0)}
                            size="small"
                          />
                        </Tooltip>
                      </TableCell>
                      
                      <TableCell>
                        {getStatusChip(candidate.status)}
                      </TableCell>
                      
                      <TableCell>
                        <Chip
                          label={candidate.cv_source || 'manual'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="View Details">
                            <IconButton
                              size="small"
                              onClick={() => handleViewDetails(candidate.candidate_id)}
                            >
                              <ViewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          
                          <Tooltip title="Notify HR">
                            <IconButton
                              size="small"
                              onClick={() => handleNotifyHR(candidate.candidate_id)}
                            >
                              <EmailIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              onClick={() => handleDelete(candidate.candidate_id)}
                              sx={{ color: '#d32f2f' }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filteredCandidates.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </CardContent>
      </Card>

      {/* Candidate Detail Dialog */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedCandidate && (
          <>
            <DialogTitle>
              Candidate Details
              <Typography variant="caption" display="block" color="text.secondary">
                {selectedCandidate.email}
              </Typography>
            </DialogTitle>
            
            <DialogContent dividers>
              <Grid container spacing={3}>
                {/* Personal Info */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    <PersonIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Personal Information
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Name
                      </Typography>
                      <Typography>
                        {selectedCandidate.name || 'Not Provided'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Phone
                      </Typography>
                      <Typography>
                        {selectedCandidate.phone || 'Not Provided'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Source
                      </Typography>
                      <Chip
                        label={selectedCandidate.cv_source}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Submitted
                      </Typography>
                      <Typography>
                        {new Date(selectedCandidate.extracted_at).toLocaleDateString()}
                      </Typography>
                    </Grid>
                  </Grid>
                </Grid>

                {/* Skill Analysis */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Skill Analysis
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Overall Match
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={selectedCandidate.skill_match_percentage} 
                        sx={{ flexGrow: 1, height: 10, borderRadius: 5 }}
                        color={getMatchColor(selectedCandidate.skill_match_percentage)}
                      />
                      <Typography variant="h6">
                        {selectedCandidate.skill_match_percentage}%
                      </Typography>
                    </Box>
                  </Box>

                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Missing Skills
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selectedCandidate.missing_skills.map((skill, index) => (
                          <Chip
                            key={index}
                            label={skill}
                            color="error"
                            size="small"
                          />
                        ))}
                        {selectedCandidate.missing_skills.length === 0 && (
                          <Typography variant="body2" color="success.main">
                            No missing skills!
                          </Typography>
                        )}
                      </Box>
                    </Grid>
                    
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Extra Skills
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selectedCandidate.extra_skills.map((skill, index) => (
                          <Chip
                            key={index}
                            label={skill}
                            color="success"
                            size="small"
                          />
                        ))}
                        {selectedCandidate.extra_skills.length === 0 && (
                          <Typography variant="body2" color="text.secondary">
                            No extra skills
                          </Typography>
                        )}
                      </Box>
                    </Grid>
                  </Grid>
                </Grid>

                {/* Skills List */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Skills ({selectedCandidate.skills.length})
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selectedCandidate.skills.map((skill, index) => (
                      <Chip
                        key={index}
                        label={skill}
                        variant="outlined"
                        size="small"
                      />
                    ))}
                  </Box>
                </Grid>

                {/* Experience */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    <WorkIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Experience
                  </Typography>
                  {selectedCandidate.experience && selectedCandidate.experience.length > 0 ? (
                    selectedCandidate.experience.map((exp, index) => (
                      <Box key={index} sx={{ mb: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          {exp.duration || 'Not specified'}
                        </Typography>
                        <Typography>
                          {exp.description || 'No description provided'}
                        </Typography>
                      </Box>
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No experience information extracted
                    </Typography>
                  )}
                </Grid>

                {/* Education */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    <SchoolIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Education
                  </Typography>
                  {selectedCandidate.education && selectedCandidate.education.length > 0 ? (
                    selectedCandidate.education.map((edu, index) => (
                      <Box key={index} sx={{ mb: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          {edu.degree || 'Not specified'}
                        </Typography>
                        <Typography>
                          {edu.institution || 'No institution provided'}
                        </Typography>
                        {edu.year && (
                          <Typography variant="caption" color="text.secondary">
                            Year: {edu.year}
                          </Typography>
                        )}
                      </Box>
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No education information extracted
                    </Typography>
                  )}
                </Grid>
              </Grid>
            </DialogContent>
            
            <DialogActions>
              <Button onClick={() => setDetailDialogOpen(false)}>
                Close
              </Button>
              <Button 
                variant="contained"
                onClick={() => {
                  setDetailDialogOpen(false);
                  handleNotifyHR(selectedCandidate.candidate_id);
                }}
                startIcon={<EmailIcon />}
              >
                Notify HR
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default CvDashboard;