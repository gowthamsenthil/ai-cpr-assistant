import { Box, Container, Typography, Paper, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import CodeIcon from '@mui/icons-material/Code';
import SchoolIcon from '@mui/icons-material/School';
import AccessibilityNewIcon from '@mui/icons-material/AccessibilityNew';

const About = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <AccessibilityNewIcon sx={{ fontSize: 50, color: 'primary.main', mb: 2 }} />,
      title: 'AR Guidance',
      description: 'Uses augmented reality to provide real-time feedback on your CPR technique.'
    },
    {
      icon: <LocalHospitalIcon sx={{ fontSize: 50, color: 'primary.main', mb: 2 }} />,
      title: 'Medical Accuracy',
      description: 'Based on the latest CPR guidelines from medical professionals.'
    },
    {
      icon: <SchoolIcon sx={{ fontSize: 50, color: 'primary.main', mb: 2 }} />,
      title: 'Easy to Use',
      description: 'Simple interface designed for use in emergency situations.'
    },
    {
      icon: <CodeIcon sx={{ fontSize: 50, color: 'primary.main', mb: 2 }} />,
      title: 'Open Source',
      description: 'Built with modern web technologies and available for contribution.'
    }
  ] as const;

  return (
    <Container maxWidth="lg">
      <Button 
        startIcon={<ArrowBackIcon />} 
        onClick={() => navigate(-1)}
        sx={{ mt: 2, mb: 4 }}
      >
        Back
      </Button>

      <Box textAlign="center" mb={6}>
        <Typography variant="h3" component="h1" gutterBottom>
          About AR CPR Assistant
        </Typography>
        <Typography variant="h6" color="text.secondary" maxWidth="800px" mx="auto">
          A mobile-responsive web application that provides real-time AR-guided CPR assistance using your smartphone's camera.
        </Typography>
      </Box>

      <Paper elevation={3} sx={{ p: 4, mb: 6, backgroundColor: 'primary.light', color: 'white' }}>
        <Typography variant="h5" gutterBottom>Our Mission</Typography>
        <Typography paragraph>
          Every year, thousands of lives could be saved if more people knew how to perform CPR correctly. 
          Our mission is to make CPR training more accessible and effective by leveraging the power of 
          augmented reality and computer vision to provide real-time feedback on CPR technique.
        </Typography>
      </Paper>

      <Box mb={8}>
        <Typography variant="h4" align="center" gutterBottom>Features</Typography>
        <Box sx={{ 
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 4,
          mt: 2
        }}>
          {features.map((feature, index) => (
            <Box key={index}>
              <Box textAlign="center" p={3} height="100%">
                {feature.icon}
                <Typography variant="h6" gutterBottom>{feature.title}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {feature.description}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      <Paper elevation={3} sx={{ p: 4, mb: 6 }}>
        <Typography variant="h5" gutterBottom>How It Works</Typography>
        <ol>
          <li><Typography>Grant camera access to the application</Typography></li>
          <li><Typography>Position the camera to see the person receiving CPR</Typography></li>
          <li><Typography>Follow the on-screen AR guidance for hand placement</Typography></li>
          <li><Typography>Perform compressions at the rate shown on screen</Typography></li>
          <li><Typography>Receive real-time feedback on compression depth and rate</Typography></li>
        </ol>
      </Paper>

      <Box textAlign="center" mb={6}>
        <Typography variant="h5" gutterBottom>Disclaimer</Typography>
        <Typography paragraph color="text.secondary" maxWidth="800px" mx="auto">
          This application is intended for educational and training purposes only. 
          It is not a substitute for professional medical advice, diagnosis, or treatment. 
          Always seek the advice of your physician or other qualified health provider 
          with any questions you may have regarding a medical condition.
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          size="large"
          onClick={() => navigate('/ar')}
          sx={{ mt: 2 }}
        >
          Try AR CPR Assistant Now
        </Button>
      </Box>
    </Container>
  );
};

export default About;
