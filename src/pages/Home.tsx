import { Box, Button, Container, Typography, Card, CardContent } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import AccessibilityNewIcon from '@mui/icons-material/AccessibilityNew';
import InfoIcon from '@mui/icons-material/Info';

const Home = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <AccessibilityNewIcon sx={{ fontSize: 60, color: 'primary.main' }} />,
      title: 'AR-Guided CPR',
      description: 'Get real-time feedback on your CPR technique using your smartphone camera and augmented reality.',
      buttonText: 'Start AR CPR',
      onClick: () => navigate('/ar')
    },
    {
      icon: <LocalHospitalIcon sx={{ fontSize: 60, color: 'primary.main' }} />,
      title: 'CPR Guide',
      description: 'Learn the proper CPR techniques with our step-by-step interactive guide.',
      buttonText: 'View Guide',
      onClick: () => navigate('/guide')
    },
    {
      icon: <InfoIcon sx={{ fontSize: 60, color: 'primary.main' }} />,
      title: 'About',
      description: 'Learn more about this project and how it can help save lives.',
      buttonText: 'Learn More',
      onClick: () => navigate('/about')
    }
  ];

  return (
    <Container maxWidth="lg">
      <Box textAlign="center" mb={6} mt={4}>
        <Typography variant="h3" component="h1" gutterBottom>
          AR CPR Assistant
        </Typography>
        <Typography variant="h5" color="text.secondary" paragraph>
          Real-time CPR guidance using augmented reality
        </Typography>
      </Box>

      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
        gap: 4,
        width: '100%',
        justifyContent: 'center'
      }}>
        {features.map((feature, index) => (
          <Box key={index} sx={{ width: '100%' }}>
            <Card 
              sx={{ 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.3s',
                '&:hover': {
                  transform: 'translateY(-8px)'
                }
              }}
            >
              <Box sx={{ p: 3, textAlign: 'center' }}>
                {feature.icon}
              </Box>
              <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
                <Typography gutterBottom variant="h5" component="h2">
                  {feature.title}
                </Typography>
                <Typography color="text.secondary" paragraph>
                  {feature.description}
                </Typography>
                <Button 
                  variant="contained" 
                  color="primary" 
                  onClick={feature.onClick}
                  fullWidth
                >
                  {feature.buttonText}
                </Button>
              </CardContent>
            </Card>
          </Box>
        ))}
      </Box>

      <Box mt={8} textAlign="center">
        <Typography variant="h5" gutterBottom>
          How It Works
        </Typography>
        <Typography variant="body1" color="text.secondary" maxWidth="800px" mx="auto">
          Our AR CPR Assistant uses your smartphone's camera and advanced computer vision to analyze your CPR technique in real-time. 
          It provides visual and audio feedback to help you maintain the correct compression rate and depth, 
          ensuring you're performing effective CPR when it matters most.
        </Typography>
      </Box>
    </Container>
  );
};

export default Home;
