export type CourseLevel = "iniciante" | "intermediario" | "avancado" | "conclusao";

export interface LessonVideo {
  youtubeId: string;
  title: string;
  duration?: string;
}

export interface LessonReference {
  title: string;
  url: string;
  source: string;
}

export interface CourseLesson {
  id: string;
  title: string;
  duration: string;
  synopsis: string;
  youtubeId?: string;
  supportVideos?: LessonVideo[];
  references?: LessonReference[];
  practiceNote?: string;
  checklist: string[];
}

export interface CourseModule {
  id: string;
  level: CourseLevel;
  title: string;
  subtitle: string;
  lessons: CourseLesson[];
}

export interface TipCard {
  id: string;
  title: string;
  body: string;
  level: CourseLevel;
}

export interface Exercise {
  id: string;
  title: string;
  goal: string;
  steps: string[];
  duration: string;
}
