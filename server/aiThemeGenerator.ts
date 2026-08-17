// AI Theme Generation using rule-based algorithms (no external APIs needed)

// Define types locally since they're specific to theme generation
export interface AIThemeRequest {
  genre?: string;
  mood?: string;
  style?: string;
}

export interface AIThemeResponse {
  theme: 'particles' | 'waveform' | 'fractal' | 'fluid';
  colors: string[];
  settings: {
    particleDensity: number;
    motionSpeed: number;
    colorIntensity: number;
    enableSync: boolean;
    enableGlow: boolean;
  };
  description: string;
}

export class AIThemeGenerator {
  /**
   * Generate AI-powered visual themes using rule-based algorithms
   * No external APIs needed - pure algorithmic approach
   */
  static async generateTheme(request: AIThemeRequest, audioAnalysis?: any): Promise<AIThemeResponse> {
    try {
      // Use rule-based theme generation based on audio analysis and request
      return this.generateRuleBasedTheme(request, audioAnalysis);
    } catch (error) {
      console.error('Theme generation failed:', error);
      // Fallback to a default theme
      return this.getFallbackTheme(request);
    }
  }

  /**
   * Rule-based theme generation using audio analysis data
   */
  private static generateRuleBasedTheme(request: AIThemeRequest, audioAnalysis?: any): AIThemeResponse {
    // Analyze audio characteristics to determine theme
    const bpm = audioAnalysis?.bpm || 120;
    const energy = audioAnalysis?.energy || 0.5;
    const danceability = audioAnalysis?.danceability || 0.5;
    const valence = audioAnalysis?.valence || 0.5;
    
    // Determine theme based on musical characteristics
    let theme: 'particles' | 'waveform' | 'fractal' | 'fluid';
    
    if (bpm > 140 && energy > 0.7) {
      theme = 'particles'; // High energy, fast tempo = particles
    } else if (bpm < 100 && valence < 0.4) {
      theme = 'fluid'; // Slow, melancholic = fluid
    } else if (energy > 0.6 && danceability > 0.6) {
      theme = 'fractal'; // Danceable and energetic = fractal patterns
    } else {
      theme = 'waveform'; // Default to classic waveform
    }
    
    // Generate colors based on mood and genre
    const colors = this.generateColorsFromAnalysis(request, audioAnalysis);
    
    // Generate settings based on audio characteristics
    const settings = {
      particleDensity: Math.round(50 + (energy * 40)), // 50-90 range
      motionSpeed: Math.round(Math.max(20, Math.min(80, bpm * 0.4))), // BPM-based speed
      colorIntensity: Math.round(60 + (energy * 30)), // 60-90 range
      enableSync: true,
      enableGlow: valence > 0.6 || energy > 0.7, // Glow for happy/energetic music
    };
    
    const description = this.generateDescription(theme, request, audioAnalysis);
    
    return {
      theme,
      colors,
      settings,
      description
    };
  }

  /**
   * Generate color palette based on musical analysis and genre
   */
  private static generateColorsFromAnalysis(request: AIThemeRequest, audioAnalysis?: any): string[] {
    const genre = request.genre?.toLowerCase() || '';
    const mood = request.mood?.toLowerCase() || '';
    const energy = audioAnalysis?.energy || 0.5;
    const valence = audioAnalysis?.valence || 0.5;
    
    // Base color palettes for different genres
    if (genre.includes('rock') || genre.includes('metal')) {
      return ['#FF4444', '#FF8800', '#FFAA00', '#CC0000', '#880000'];
    }
    
    if (genre.includes('electronic') || genre.includes('edm') || genre.includes('techno')) {
      return ['#00FFFF', '#FF00FF', '#8B5CF6', '#06B6D4', '#FFFF00'];
    }
    
    if (genre.includes('jazz') || genre.includes('blues')) {
      return ['#1E40AF', '#7C3AED', '#F59E0B', '#92400E', '#374151'];
    }
    
    if (genre.includes('classical') || genre.includes('orchestral')) {
      return ['#6B7280', '#374151', '#D1D5DB', '#F3F4F6', '#1F2937'];
    }
    
    if (genre.includes('pop') || genre.includes('dance')) {
      return ['#F59E0B', '#EF4444', '#EC4899', '#8B5CF6', '#06B6D4'];
    }
    
    // Mood-based colors
    if (mood.includes('happy') || mood.includes('energetic') || mood.includes('upbeat')) {
      return ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA500'];
    }
    
    if (mood.includes('sad') || mood.includes('melancholic') || mood.includes('dark')) {
      return ['#4A5568', '#2D3748', '#1A202C', '#6B73FF', '#9F7AEA'];
    }
    
    if (mood.includes('calm') || mood.includes('peaceful') || mood.includes('ambient')) {
      return ['#06B6D4', '#0EA5E9', '#3B82F6', '#8B5CF6', '#A855F7'];
    }
    
    // Energy and valence-based colors
    if (energy > 0.7 && valence > 0.6) {
      // High energy, positive = bright, vibrant colors
      return ['#FF6B6B', '#4ECDC4', '#45B7D1', '#F7DC6F', '#BB8FCE'];
    }
    
    if (energy < 0.4 && valence < 0.4) {
      // Low energy, negative = muted, cool colors
      return ['#5D6D7E', '#85929E', '#AEB6BF', '#D5DBDB', '#48C9B0'];
    }
    
    // Default: Purple-cyan gradient (matches app theme)
    return ['#8B5CF6', '#06B6D4', '#F59E0B', '#EF4444', '#10B981'];
  }
  
  /**
   * Generate human-readable description of the theme
   */
  private static generateDescription(theme: string, request: AIThemeRequest, audioAnalysis?: any): string {
    const bpm = audioAnalysis?.bpm || 120;
    const energy = audioAnalysis?.energy || 0.5;
    const genre = request.genre || 'music';
    
    const energyDesc = energy > 0.7 ? 'high-energy' : energy > 0.4 ? 'moderate-energy' : 'calm';
    const tempoDesc = bpm > 140 ? 'fast-paced' : bpm > 100 ? 'moderate-tempo' : 'slow';
    
    const themeDescriptions = {
      particles: `Dynamic particle system perfect for ${energyDesc} ${genre}`,
      waveform: `Classic waveform visualization for ${tempoDesc} ${genre}`,
      fractal: `Geometric fractal patterns matching the rhythm of ${genre}`,
      fluid: `Flowing fluid dynamics capturing the essence of ${energyDesc} ${genre}`
    };
    
    return themeDescriptions[theme as keyof typeof themeDescriptions] || `Custom ${theme} theme for ${genre}`;
  }



  private static getFallbackTheme(request: AIThemeRequest): AIThemeResponse {
    // Generate a basic theme based on request data
    const themes: Array<'particles' | 'waveform' | 'fractal' | 'fluid'> = ['particles', 'waveform', 'fractal', 'fluid'];
    const theme = themes[Math.floor(Math.random() * themes.length)];
    
    // Select colors based on genre/mood
    let colors = ['#8B5CF6', '#06B6D4', '#F59E0B', '#EF4444', '#10B981']; // Default purple/cyan theme
    
    if (request.genre) {
      const genre = request.genre.toLowerCase();
      if (genre.includes('rock') || genre.includes('metal')) {
        colors = ['#EF4444', '#F97316', '#FEF3C7', '#1F2937', '#374151'];
      } else if (genre.includes('electronic') || genre.includes('edm')) {
        colors = ['#8B5CF6', '#06B6D4', '#00D9FF', '#FF00FF', '#FFFF00'];
      } else if (genre.includes('jazz') || genre.includes('blues')) {
        colors = ['#1E40AF', '#7C3AED', '#F59E0B', '#92400E', '#1F2937'];
      } else if (genre.includes('classical')) {
        colors = ['#374151', '#6B7280', '#D1D5DB', '#F3F4F6', '#1F2937'];
      }
    }
    
    if (request.mood) {
      const mood = request.mood.toLowerCase();
      if (mood.includes('energetic') || mood.includes('happy')) {
        colors = ['#F59E0B', '#EF4444', '#FF6B6B', '#4ECDC4', '#45B7D1'];
      } else if (mood.includes('calm') || mood.includes('peaceful')) {
        colors = ['#06B6D4', '#0EA5E9', '#3B82F6', '#8B5CF6', '#A855F7'];
      } else if (mood.includes('dark') || mood.includes('intense')) {
        colors = ['#1F2937', '#374151', '#EF4444', '#B91C1C', '#7F1D1D'];
      }
    }
    
    return {
      theme,
      colors,
      settings: {
        particleDensity: 75,
        motionSpeed: 50,
        colorIntensity: 80,
        enableSync: true,
        enableGlow: true,
      },
      description: `Fallback ${theme} theme with ${request.genre || 'generic'} styling`
    };
  }
}

export default AIThemeGenerator;