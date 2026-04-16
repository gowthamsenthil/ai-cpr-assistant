import React from 'react';
import { Box, Container, Typography, Stepper, Step, StepLabel, Card, CardContent, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const steps = [
  {
    label: 'Check Responsiveness',
    description: 'Gently shake the person and shout, "Are you okay?" to check for responsiveness.'
  },
  {
    label: 'Call for Help',
    description: 'If the person is unresponsive, call emergency services or ask someone nearby to call.'
  },
  {
    label: 'Open Airway',
    description: 'Tilt the head back and lift the chin to open the airway.'
  },
  {
    label: 'Check Breathing',
    description: 'Look, listen, and feel for normal breathing for no more than 10 seconds.'
  },
  {
    label: 'Chest Compressions',
    description: 'Place the heel of one hand on the center of the chest, place the other hand on top, and interlock your fingers. Push hard and fast at a rate of 100-120 compressions per minute.'
  },
  {
    label: 'Rescue Breaths',
    description: 'After 30 compressions, give 2 rescue breaths. Tilt the head back, pinch the nose shut, and give a breath that makes the chest rise.'
  },
  {
    label: 'Continue CPR',
    description: 'Continue cycles of 30 compressions and 2 breaths until help arrives or the person starts breathing normally.'
  }
];

const CPRGuide = () => {
  const navigate = useNavigate();
  const [activeStep] = React.useState(0);

  return (
    <Container maxWidth="md">
      <Button 
        startIcon={<ArrowBackIcon />} 
        onClick={() => navigate(-1)}
        sx={{ mt: 2, mb: 4 }}
      >
        Back
      </Button>
      
      <Box textAlign="center" mb={6}>
        <Typography variant="h3" component="h1" gutterBottom>
          CPR Step-by-Step Guide
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Learn how to perform CPR correctly in emergency situations
        </Typography>
      </Box>

      <Stepper activeStep={activeStep} orientation="vertical" sx={{ mb: 4 }}>
        {steps.map((step, index) => (
          <Step key={step.label}>
            <StepLabel
              optional={
                index === activeStep ? (
                  <Typography variant="body2" color="text.secondary">
                    {step.description}
                  </Typography>
                ) : null
              }
            >
              <Typography variant="subtitle1">{step.label}</Typography>
            </StepLabel>
          </Step>
        ))}
      </Stepper>

      <Card sx={{ mb: 4, bgcolor: 'primary.light' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom color="white">
            Important Notes:
          </Typography>
          <ul style={{ color: 'white', paddingLeft: 20 }}>
            <li>CPR should only be performed on someone who is unresponsive and not breathing normally.</li>
            <li>If you're not trained in CPR, perform hands-only CPR (chest compressions only).</li>
            <li>Push hard and fast in the center of the chest to the beat of the song "Stayin' Alive".</li>
            <li>Don't stop CPR until help arrives or the person starts breathing normally.</li>
          </ul>
        </CardContent>
      </Card>

      <Box textAlign="center" mt={4}>
        <Button 
          variant="contained" 
          color="primary" 
          size="large"
          onClick={() => navigate('/ar')}
          sx={{ mb: 4 }}
        >
          Practice with AR Guidance
        </Button>
      </Box>
    </Container>
  );
};

export default CPRGuide;
