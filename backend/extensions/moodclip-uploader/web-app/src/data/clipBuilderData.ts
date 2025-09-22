export interface TranscriptWord {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  speaker: string;
  isHook?: boolean;
}

export interface TranscriptParagraph {
  id: string;
  timestamp: string;
  speaker: string;
  words: TranscriptWord[];
}

export interface ClipChip {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  duration: string;
}

export interface AIClipBubble {
  id: string;
  name: string;
  tint: string;
  clips: ClipChip[];
}

export interface ClipBuilderData {
  transcript: TranscriptParagraph[];
  aiMoments: AIClipBubble[];
  sourceVideo: {
    url: string;
    duration: number;
  };
}

// Mock data for realistic preview
export const mockClipBuilderData: ClipBuilderData = {
  transcript: [
    {
      id: "p1",
      timestamp: "00:00",
      speaker: "Alex",
      words: [
        { id: "w1", text: "Welcome", startTime: 0, endTime: 0.5, speaker: "Alex" },
        { id: "w2", text: "to", startTime: 0.5, endTime: 0.7, speaker: "Alex" },
        { id: "w3", text: "our", startTime: 0.7, endTime: 0.9, speaker: "Alex" },
        { id: "w4", text: "revolutionary", startTime: 0.9, endTime: 1.8, speaker: "Alex", isHook: true },
        { id: "w5", text: "new", startTime: 1.8, endTime: 2.0, speaker: "Alex" },
        { id: "w6", text: "platform", startTime: 2.0, endTime: 2.6, speaker: "Alex" },
        { id: "w7", text: "that's", startTime: 2.6, endTime: 2.9, speaker: "Alex" },
        { id: "w8", text: "going", startTime: 2.9, endTime: 3.2, speaker: "Alex" },
        { id: "w9", text: "to", startTime: 3.2, endTime: 3.4, speaker: "Alex" },
        { id: "w10", text: "change", startTime: 3.4, endTime: 3.8, speaker: "Alex", isHook: true },
        { id: "w11", text: "everything.", startTime: 3.8, endTime: 4.5, speaker: "Alex", isHook: true }
      ]
    },
    {
      id: "p2", 
      timestamp: "00:05",
      speaker: "Alex",
      words: [
        { id: "w12", text: "I've", startTime: 5, endTime: 5.2, speaker: "Alex" },
        { id: "w13", text: "been", startTime: 5.2, endTime: 5.4, speaker: "Alex" },
        { id: "w14", text: "working", startTime: 5.4, endTime: 5.8, speaker: "Alex" },
        { id: "w15", text: "on", startTime: 5.8, endTime: 6.0, speaker: "Alex" },
        { id: "w16", text: "this", startTime: 6.0, endTime: 6.2, speaker: "Alex" },
        { id: "w17", text: "for", startTime: 6.2, endTime: 6.4, speaker: "Alex" },
        { id: "w18", text: "three", startTime: 6.4, endTime: 6.8, speaker: "Alex" },
        { id: "w19", text: "years", startTime: 6.8, endTime: 7.2, speaker: "Alex" },
        { id: "w20", text: "straight,", startTime: 7.2, endTime: 7.8, speaker: "Alex" },
        { id: "w21", text: "and", startTime: 7.8, endTime: 8.0, speaker: "Alex" },
        { id: "w22", text: "the", startTime: 8.0, endTime: 8.2, speaker: "Alex" },
        { id: "w23", text: "results", startTime: 8.2, endTime: 8.8, speaker: "Alex", isHook: true },
        { id: "w24", text: "are", startTime: 8.8, endTime: 9.0, speaker: "Alex" },
        { id: "w25", text: "incredible.", startTime: 9.0, endTime: 9.8, speaker: "Alex", isHook: true }
      ]
    },
    {
      id: "p3",
      timestamp: "00:10", 
      speaker: "Sarah",
      words: [
        { id: "w26", text: "That", startTime: 10, endTime: 10.3, speaker: "Sarah" },
        { id: "w27", text: "sounds", startTime: 10.3, endTime: 10.7, speaker: "Sarah" },
        { id: "w28", text: "amazing,", startTime: 10.7, endTime: 11.2, speaker: "Sarah" },
        { id: "w29", text: "Alex.", startTime: 11.2, endTime: 11.6, speaker: "Sarah" },
        { id: "w30", text: "Can", startTime: 11.6, endTime: 11.8, speaker: "Sarah" },
        { id: "w31", text: "you", startTime: 11.8, endTime: 12.0, speaker: "Sarah" },
        { id: "w32", text: "tell", startTime: 12.0, endTime: 12.2, speaker: "Sarah" },
        { id: "w33", text: "us", startTime: 12.2, endTime: 12.4, speaker: "Sarah" },
        { id: "w34", text: "more", startTime: 12.4, endTime: 12.7, speaker: "Sarah" },
        { id: "w35", text: "about", startTime: 12.7, endTime: 13.0, speaker: "Sarah" },
        { id: "w36", text: "the", startTime: 13.0, endTime: 13.2, speaker: "Sarah" },
        { id: "w37", text: "technology", startTime: 13.2, endTime: 14.0, speaker: "Sarah" },
        { id: "w38", text: "behind", startTime: 14.0, endTime: 14.4, speaker: "Sarah" },
        { id: "w39", text: "it?", startTime: 14.4, endTime: 14.8, speaker: "Sarah" }
      ]
    },
    {
      id: "p4",
      timestamp: "00:15",
      speaker: "Alex", 
      words: [
        { id: "w40", text: "Absolutely.", startTime: 15, endTime: 15.8, speaker: "Alex" },
        { id: "w41", text: "We're", startTime: 15.8, endTime: 16.1, speaker: "Alex" },
        { id: "w42", text: "using", startTime: 16.1, endTime: 16.4, speaker: "Alex" },
        { id: "w43", text: "cutting-edge", startTime: 16.4, endTime: 17.2, speaker: "Alex", isHook: true },
        { id: "w44", text: "AI", startTime: 17.2, endTime: 17.5, speaker: "Alex", isHook: true },
        { id: "w45", text: "algorithms", startTime: 17.5, endTime: 18.2, speaker: "Alex", isHook: true },
        { id: "w46", text: "that", startTime: 18.2, endTime: 18.4, speaker: "Alex" },
        { id: "w47", text: "can", startTime: 18.4, endTime: 18.6, speaker: "Alex" },
        { id: "w48", text: "process", startTime: 18.6, endTime: 19.1, speaker: "Alex" },
        { id: "w49", text: "massive", startTime: 19.1, endTime: 19.6, speaker: "Alex" },
        { id: "w50", text: "datasets", startTime: 19.6, endTime: 20.2, speaker: "Alex" },
        { id: "w51", text: "in", startTime: 20.2, endTime: 20.4, speaker: "Alex" },
        { id: "w52", text: "real-time.", startTime: 20.4, endTime: 21.0, speaker: "Alex" }
      ]
    },
    {
      id: "p5",
      timestamp: "00:21",
      speaker: "Alex",
      words: [
        { id: "w53", text: "The", startTime: 21, endTime: 21.2, speaker: "Alex" },
        { id: "w54", text: "breakthrough", startTime: 21.2, endTime: 22.0, speaker: "Alex", isHook: true },
        { id: "w55", text: "came", startTime: 22.0, endTime: 22.3, speaker: "Alex" },
        { id: "w56", text: "when", startTime: 22.3, endTime: 22.5, speaker: "Alex" },
        { id: "w57", text: "we", startTime: 22.5, endTime: 22.7, speaker: "Alex" },
        { id: "w58", text: "realized", startTime: 22.7, endTime: 23.3, speaker: "Alex" },
        { id: "w59", text: "we", startTime: 23.3, endTime: 23.5, speaker: "Alex" },
        { id: "w60", text: "could", startTime: 23.5, endTime: 23.8, speaker: "Alex" },
        { id: "w61", text: "combine", startTime: 23.8, endTime: 24.4, speaker: "Alex" },
        { id: "w62", text: "natural", startTime: 24.4, endTime: 24.9, speaker: "Alex" },
        { id: "w63", text: "language", startTime: 24.9, endTime: 25.5, speaker: "Alex" },
        { id: "w64", text: "processing", startTime: 25.5, endTime: 26.2, speaker: "Alex" },
        { id: "w65", text: "with", startTime: 26.2, endTime: 26.4, speaker: "Alex" },
        { id: "w66", text: "machine", startTime: 26.4, endTime: 26.9, speaker: "Alex" },
        { id: "w67", text: "learning.", startTime: 26.9, endTime: 27.6, speaker: "Alex" }
      ]
    },
    {
      id: "p6",
      timestamp: "00:28",
      speaker: "Sarah",
      words: [
        { id: "w68", text: "That's", startTime: 28, endTime: 28.3, speaker: "Sarah" },
        { id: "w69", text: "fascinating!", startTime: 28.3, endTime: 29.0, speaker: "Sarah" },
        { id: "w70", text: "How", startTime: 29.0, endTime: 29.2, speaker: "Sarah" },
        { id: "w71", text: "long", startTime: 29.2, endTime: 29.5, speaker: "Sarah" },
        { id: "w72", text: "did", startTime: 29.5, endTime: 29.7, speaker: "Sarah" },
        { id: "w73", text: "it", startTime: 29.7, endTime: 29.8, speaker: "Sarah" },
        { id: "w74", text: "take", startTime: 29.8, endTime: 30.1, speaker: "Sarah" },
        { id: "w75", text: "to", startTime: 30.1, endTime: 30.2, speaker: "Sarah" },
        { id: "w76", text: "develop", startTime: 30.2, endTime: 30.7, speaker: "Sarah" },
        { id: "w77", text: "this", startTime: 30.7, endTime: 30.9, speaker: "Sarah" },
        { id: "w78", text: "algorithm?", startTime: 30.9, endTime: 31.6, speaker: "Sarah" }
      ]
    },
    {
      id: "p7",
      timestamp: "00:32",
      speaker: "Alex",
      words: [
        { id: "w79", text: "Well,", startTime: 32, endTime: 32.3, speaker: "Alex" },
        { id: "w80", text: "it", startTime: 32.3, endTime: 32.4, speaker: "Alex" },
        { id: "w81", text: "wasn't", startTime: 32.4, endTime: 32.8, speaker: "Alex" },
        { id: "w82", text: "just", startTime: 32.8, endTime: 33.0, speaker: "Alex" },
        { id: "w83", text: "about", startTime: 33.0, endTime: 33.3, speaker: "Alex" },
        { id: "w84", text: "the", startTime: 33.3, endTime: 33.5, speaker: "Alex" },
        { id: "w85", text: "time,", startTime: 33.5, endTime: 33.9, speaker: "Alex" },
        { id: "w86", text: "but", startTime: 33.9, endTime: 34.1, speaker: "Alex" },
        { id: "w87", text: "the", startTime: 34.1, endTime: 34.3, speaker: "Alex" },
        { id: "w88", text: "countless", startTime: 34.3, endTime: 35.0, speaker: "Alex", isHook: true },
        { id: "w89", text: "iterations", startTime: 35.0, endTime: 35.7, speaker: "Alex", isHook: true },
        { id: "w90", text: "and", startTime: 35.7, endTime: 35.9, speaker: "Alex" },
        { id: "w91", text: "failed", startTime: 35.9, endTime: 36.3, speaker: "Alex" },
        { id: "w92", text: "experiments.", startTime: 36.3, endTime: 37.2, speaker: "Alex" }
      ]
    },
    {
      id: "p8",
      timestamp: "00:37",
      speaker: "Alex",
      words: [
        { id: "w93", text: "We", startTime: 37.5, endTime: 37.7, speaker: "Alex" },
        { id: "w94", text: "had", startTime: 37.7, endTime: 37.9, speaker: "Alex" },
        { id: "w95", text: "to", startTime: 37.9, endTime: 38.0, speaker: "Alex" },
        { id: "w96", text: "completely", startTime: 38.0, endTime: 38.7, speaker: "Alex" },
        { id: "w97", text: "rethink", startTime: 38.7, endTime: 39.3, speaker: "Alex", isHook: true },
        { id: "w98", text: "our", startTime: 39.3, endTime: 39.5, speaker: "Alex" },
        { id: "w99", text: "approach", startTime: 39.5, endTime: 40.1, speaker: "Alex", isHook: true },
        { id: "w100", text: "multiple", startTime: 40.1, endTime: 40.6, speaker: "Alex" },
        { id: "w101", text: "times,", startTime: 40.6, endTime: 41.0, speaker: "Alex" },
        { id: "w102", text: "but", startTime: 41.0, endTime: 41.2, speaker: "Alex" },
        { id: "w103", text: "that's", startTime: 41.2, endTime: 41.5, speaker: "Alex" },
        { id: "w104", text: "what", startTime: 41.5, endTime: 41.7, speaker: "Alex" },
        { id: "w105", text: "led", startTime: 41.7, endTime: 41.9, speaker: "Alex" },
        { id: "w106", text: "to", startTime: 41.9, endTime: 42.0, speaker: "Alex" },
        { id: "w107", text: "the", startTime: 42.0, endTime: 42.2, speaker: "Alex" },
        { id: "w108", text: "breakthrough.", startTime: 42.2, endTime: 43.0, speaker: "Alex", isHook: true }
      ]
    },
    {
      id: "p9",
      timestamp: "00:43",
      speaker: "Sarah",
      words: [
        { id: "w109", text: "What", startTime: 43.5, endTime: 43.8, speaker: "Sarah" },
        { id: "w110", text: "kind", startTime: 43.8, endTime: 44.0, speaker: "Sarah" },
        { id: "w111", text: "of", startTime: 44.0, endTime: 44.2, speaker: "Sarah" },
        { id: "w112", text: "applications", startTime: 44.2, endTime: 45.0, speaker: "Sarah" },
        { id: "w113", text: "are", startTime: 45.0, endTime: 45.2, speaker: "Sarah" },
        { id: "w114", text: "you", startTime: 45.2, endTime: 45.4, speaker: "Sarah" },
        { id: "w115", text: "envisioning", startTime: 45.4, endTime: 46.2, speaker: "Sarah" },
        { id: "w116", text: "for", startTime: 46.2, endTime: 46.4, speaker: "Sarah" },
        { id: "w117", text: "this", startTime: 46.4, endTime: 46.6, speaker: "Sarah" },
        { id: "w118", text: "technology?", startTime: 46.6, endTime: 47.5, speaker: "Sarah" }
      ]
    },
    {
      id: "p10",
      timestamp: "00:48",
      speaker: "Alex",
      words: [
        { id: "w119", text: "The", startTime: 48, endTime: 48.2, speaker: "Alex" },
        { id: "w120", text: "possibilities", startTime: 48.2, endTime: 49.1, speaker: "Alex", isHook: true },
        { id: "w121", text: "are", startTime: 49.1, endTime: 49.3, speaker: "Alex" },
        { id: "w122", text: "endless!", startTime: 49.3, endTime: 50.0, speaker: "Alex", isHook: true },
        { id: "w123", text: "From", startTime: 50.0, endTime: 50.3, speaker: "Alex" },
        { id: "w124", text: "healthcare", startTime: 50.3, endTime: 51.0, speaker: "Alex" },
        { id: "w125", text: "to", startTime: 51.0, endTime: 51.2, speaker: "Alex" },
        { id: "w126", text: "finance,", startTime: 51.2, endTime: 51.8, speaker: "Alex" },
        { id: "w127", text: "education", startTime: 51.8, endTime: 52.5, speaker: "Alex" },
        { id: "w128", text: "to", startTime: 52.5, endTime: 52.7, speaker: "Alex" },
        { id: "w129", text: "entertainment.", startTime: 52.7, endTime: 53.8, speaker: "Alex" }
      ]
    }
  ],
  aiMoments: [
    {
      id: "ai1",
      name: "AI Clip 1",
      tint: "hsl(280 100% 70%)", // Purple from theme
      clips: [
        {
          id: "c1",
          text: "Welcome to our revolutionary new platform that's going to change everything.",
          startTime: 0,
          endTime: 4.5,
          duration: "4s"
        },
        {
          id: "c2", 
          text: "I've been working on this for three years straight, and the results are incredible.",
          startTime: 5,
          endTime: 9.8,
          duration: "5s"
        },
        {
          id: "c3",
          text: "We're using cutting-edge AI algorithms",
          startTime: 16.1,
          endTime: 18.2,
          duration: "2s"
        }
      ]
    },
    {
      id: "ai2", 
      name: "AI Clip 2",
      tint: "hsl(140 60% 55%)", // Green from theme
      clips: [
        {
          id: "c4",
          text: "Can you tell us more about the technology behind it?",
          startTime: 12.0,
          endTime: 14.8,
          duration: "3s"
        },
        {
          id: "c5",
          text: "The breakthrough came when we realized we could combine natural language processing with machine learning.",
          startTime: 21.2,
          endTime: 27.6,
          duration: "6s"  
        }
      ]
    },
    {
      id: "ai3",
      name: "AI Clip 3", 
      tint: "hsl(200 90% 60%)", // Blue variant
      clips: [
        {
          id: "c6",
          text: "process massive datasets in real-time",
          startTime: 18.6,
          endTime: 21.0,
          duration: "2s"
        }
      ]
    }
  ],
  sourceVideo: {
    url: "/placeholder-video.mp4",
    duration: 30
  }
};