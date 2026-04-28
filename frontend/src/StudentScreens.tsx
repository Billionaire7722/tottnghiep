import { useMemo, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import cnxhMark from "./assets/cnxh-mark.svg";
import {
  apiAssetUrl,
  type Attempt,
  type Question,
  type QuizResult,
  type StudyLesson,
  type StudyLessonAttachment,
  type StudySlide,
  type User
} from "./api";
import { Icon, type IconName } from "./Icons";
import { RichQuestionContent } from "./RichQuestionContent";
import {
  formatDate,
  getSubjectOption,
  roleLabel,
  subjectOptions,
  subjectStudyTopics,
  type SubjectCode
} from "./uiTypes";

type SubjectCountMap = Partial<Record<SubjectCode, number>>;
type NavActive = "home" | "study" | "test" | "profile";
export type QuizQuestionLimit = 10 | 20 | 50 | "all";

const quizQuestionLimitOptions: QuizQuestionLimit[] = [10, 20, 50, "all"];

const subjectIconMap: Record<SubjectCode, IconName> = {
  dich_te: "stethoscope",
  suc_khoe_nghe_nghiep: "briefcase",
  dinh_duong: "leaf",
  suc_khoe_moi_truong: "shield"
};

export function PhoneShell({ children }: { children: ReactNode }) {
  return (
    <div className="phone-frame">
      <div className="phone-screen">{children}</div>
    </div>
  );
}

export function LoginScreen({
  username,
  password,
  busy,
  onUsernameChange,
  onPasswordChange,
  onSubmit
}: {
  username: string;
  password: string;
  busy: boolean;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="phone-frame login-frame">
      <div className="phone-screen login-screen">
        <img className="brand-mark" src={cnxhMark} alt="Biểu tượng CNXH" />
        <h1>CNXH</h1>
        <p>Ôn thi trắc nghiệm</p>
        <form className="login-form" onSubmit={onSubmit} autoComplete="off">
          <label>
            Tên đăng nhập
            <input value={username} onChange={(event) => onUsernameChange(event.target.value)} autoComplete="off" />
          </label>
          <label>
            Mật khẩu
            <input
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              type="password"
              autoComplete="new-password"
            />
          </label>
          <button type="submit" disabled={busy}>
            {busy ? "Đang đăng nhập" : "Đăng nhập"}
          </button>
        </form>
      </div>
    </section>
  );
}

type TopBarAction = {
  label: string;
  onClick: () => void;
  tone?: "danger" | "default";
};

export function TopBar({ user, action }: { user: User; action?: TopBarAction }) {
  return (
    <header className="top-bar">
      <div>
        <strong>{user.displayName}</strong>
        <span>{roleLabel(user.role)}</span>
      </div>
      {action && (
        <button className={action.tone === "danger" ? "danger-text-button" : "ghost-button"} type="button" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </header>
  );
}

export function StartScreen({
  user,
  attempts,
  subjectCounts,
  studiedCounts,
  onSubjectSelect,
  onStudyTab,
  onTestTab,
  onHistory,
  onAdmin,
  onLogout
}: {
  user: User;
  attempts: Attempt[];
  subjectCounts: SubjectCountMap;
  studiedCounts: SubjectCountMap;
  onSubjectSelect: (value: SubjectCode) => void;
  onStudyTab: () => void;
  onTestTab: () => void;
  onHistory: () => void;
  onAdmin: () => void;
  onLogout: () => void;
}) {
  const latest = attempts[0];
  const bestPercentage = attempts.reduce((best, attempt) => Math.max(best, Math.round(attempt.percentage)), 0);

  return (
    <div className="student-screen dashboard-screen">
      <header className="dashboard-hero">
        <div className="dashboard-identity">
          <div className="student-avatar" aria-hidden="true">
            {getInitial(user.displayName)}
          </div>
          <div>
            <p>Xin chào, {user.displayName || "bạn"}!</p>
            <span>{roleLabel(user.role)}</span>
          </div>
        </div>
        <div className="dashboard-actions">
          {(user.role === "admin" || user.role === "editor") && (
            <button className="secondary-button" type="button" onClick={onAdmin}>
              <Icon name="shield" />
              Quản trị
            </button>
          )}
          <button className="home-logout-button" type="button" onClick={onLogout}>
            <Icon name="logOut" />
            Đăng xuất
          </button>
        </div>
      </header>

      <section className="score-summary" aria-label="Tổng quan học tập">
        <SummaryMetric icon="clipboard" label="Điểm gần nhất" value={latest ? `${latest.score}/${latest.total}` : "--"} />
        <SummaryMetric icon="trophy" label="Điểm tốt nhất" value={bestPercentage ? `${bestPercentage}%` : "--"} />
      </section>

      <section className="subject-section">
        <div className="section-heading">
          <h2>Chọn môn học</h2>
          <small>Chọn môn rồi vào ôn tập hoặc làm bài kiểm tra</small>
        </div>
        <div className="subject-grid">
          {subjectOptions.map((subject) => {
            const total = subjectCounts[subject.value];
            const isLoading = total === undefined;
            const questionCount = total ?? 0;
            return (
              <button className="subject-card" key={subject.value} type="button" onClick={() => onSubjectSelect(subject.value)}>
                <span className="subject-card-icon" aria-hidden="true">
                  <Icon name={subjectIconMap[subject.value]} />
                </span>
                <strong>{subject.label}</strong>
                <small>{subject.description}</small>
                <em>{isLoading ? "Đang tải dữ liệu" : questionCount > 0 ? `${questionCount} câu hỏi trắc nghiệm` : "Chưa có câu hỏi"}</em>
                <span className="subject-card-cta">
                  Vào môn
                  <Icon name="arrowLeft" />
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <BottomNav active="home" onHome={() => undefined} onStudy={onStudyTab} onTest={onTestTab} onProfile={onHistory} />
    </div>
  );
}

export function ModeScreen({
  subject,
  totalQuestions,
  studiedQuestions,
  studyBusy,
  quizBusy,
  onBack,
  onStudy,
  onStartQuiz,
  onSubjectSelect,
  onHistory,
  onHome
}: {
  subject: SubjectCode;
  totalQuestions: number;
  studiedQuestions: number;
  studyBusy: boolean;
  quizBusy: boolean;
  onBack: () => void;
  onStudy: () => void;
  onStartQuiz: () => void;
  onSubjectSelect: (value: SubjectCode) => void;
  onHistory: () => void;
  onHome: () => void;
}) {
  const currentSubject = getSubjectOption(subject);
  const progress = totalQuestions > 0 ? Math.round((Math.min(studiedQuestions, totalQuestions) / totalQuestions) * 100) : 0;

  return (
    <div className="student-screen mode-screen">
      <ScreenHeader title="Chọn chế độ học" onBack={onBack} />

      <section className="mode-intro">
        <h1>{currentSubject.label}</h1>
        <div className="progress-row">
          <span>Tiến độ: {progress}% hoàn thành</span>
          <span>
            {Math.min(studiedQuestions, totalQuestions)}/{totalQuestions || 0} đã ôn
          </span>
        </div>
        <span className="wide-progress" aria-hidden="true">
          <span style={{ width: `${progress}%` }} />
        </span>
      </section>

      <div className="mode-grid">
        <button className="mode-card" type="button" onClick={onStudy} disabled={studyBusy}>
          <span className="mode-card-icon" aria-hidden="true">
            <Icon name="book" />
          </span>
          <strong>Ôn tập kiến thức</strong>
          <small>Xem bài học, ghi chú và tài liệu do admin hoặc người chỉnh sửa đăng lên.</small>
        </button>
        <button className="mode-card" type="button" onClick={onStartQuiz} disabled={quizBusy}>
          <span className="mode-card-icon" aria-hidden="true">
            <Icon name="clipboard" />
          </span>
          <strong>Làm bài kiểm tra</strong>
          <small>Thử thách bản thân với bộ câu hỏi trắc nghiệm.</small>
        </button>
      </div>

      <section className="related-section">
        <h2>Chủ đề liên quan</h2>
        <div className="related-list">
          {subjectOptions
            .filter((option) => option.value !== subject)
            .map((option) => (
              <button className="related-card" key={option.value} type="button" onClick={() => onSubjectSelect(option.value)}>
                <strong>{option.label}</strong>
                <span aria-hidden="true" className="related-card-arrow">
                  <Icon name="arrowLeft" />
                </span>
              </button>
            ))}
        </div>
      </section>

      <BottomNav active="home" onHome={onHome} onStudy={onStudy} onTest={onStartQuiz} onProfile={onHistory} />
    </div>
  );
}

export function QuizSetupScreen({
  subject,
  totalQuestions,
  selectedLimit,
  quizBusy,
  onLimitChange,
  onBack,
  onStartQuiz,
  onHome,
  onHistory
}: {
  subject: SubjectCode;
  totalQuestions?: number;
  selectedLimit: QuizQuestionLimit;
  quizBusy: boolean;
  onLimitChange: (value: QuizQuestionLimit) => void;
  onBack: () => void;
  onStartQuiz: (value: QuizQuestionLimit) => void;
  onHome: () => void;
  onHistory: () => void;
}) {
  const currentSubject = getSubjectOption(subject);
  const questionCountKnown = typeof totalQuestions === "number";
  const availableQuestions = totalQuestions ?? 0;
  const selectedLimitAvailable = isQuizQuestionLimitAvailable(selectedLimit, totalQuestions);

  return (
    <div className="student-screen quiz-setup-screen">
      <ScreenHeader title="Thiết lập bài kiểm tra" subtitle={currentSubject.label} onBack={onBack} />

      <section className="quiz-setup-panel">
        <div className="lesson-detail-kicker">
          <Icon name="clipboard" />
          <span>{currentSubject.label}</span>
        </div>
        <h1>Chọn số lượng câu hỏi</h1>
        <p>
          {questionCountKnown
            ? availableQuestions > 0
              ? `Hiện có ${availableQuestions} câu hỏi khả dụng.`
              : "Môn này chưa có câu hỏi khả dụng."
            : "Đang cập nhật số câu hỏi khả dụng."}
        </p>

        <div className="quiz-limit-grid" role="radiogroup" aria-label="Số lượng câu hỏi">
          {quizQuestionLimitOptions.map((option) => {
            const disabled = !isQuizQuestionLimitAvailable(option, totalQuestions);
            const isSelected = selectedLimit === option;

            return (
              <button
                className={isSelected ? "quiz-limit-option active" : "quiz-limit-option"}
                key={String(option)}
                type="button"
                onClick={() => onLimitChange(option)}
                disabled={disabled || quizBusy}
                role="radio"
                aria-checked={isSelected}
              >
                <strong>{option === "all" ? "Tất cả" : option}</strong>
                <span>{quizLimitDescription(option, totalQuestions)}</span>
              </button>
            );
          })}
        </div>

        <button
          className="quiz-setup-start"
          type="button"
          onClick={() => onStartQuiz(selectedLimit)}
          disabled={quizBusy || !selectedLimitAvailable}
        >
          {quizBusy ? "Đang tạo bài" : "Bắt đầu làm bài"}
        </button>
      </section>

      <BottomNav active="test" onHome={onHome} onStudy={onBack} onTest={() => undefined} onProfile={onHistory} />
    </div>
  );
}

export function StudyScreen({
  subject,
  lessons,
  slides,
  onBack,
  onStartQuiz,
  onHome,
  onHistory
}: {
  subject: SubjectCode;
  lessons: StudyLesson[];
  slides: StudySlide[];
  questions: Question[];
  studiedQuestionIds: Set<number>;
  onMarkStudied: (questionId: number) => void;
  onBack: () => void;
  onStartQuiz: () => void;
  onHome: () => void;
  onHistory: () => void;
}) {
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<{ type: "lesson"; id: number } | { type: "slide"; id: string } | null>(null);
  const currentSubject = getSubjectOption(subject);
  const normalizedSearch = search.trim().toLowerCase();
  const filteredLessons = useMemo(
    () =>
      normalizedSearch
        ? lessons.filter((lesson) => `${lesson.title} ${lesson.summary} ${lesson.content}`.toLowerCase().includes(normalizedSearch))
        : lessons,
    [lessons, normalizedSearch]
  );
  const filteredSlides = useMemo(
    () =>
      normalizedSearch
        ? slides.filter((slide) => `${slide.title} ${slide.fileName}`.toLowerCase().includes(normalizedSearch))
        : slides,
    [slides, normalizedSearch]
  );
  const selectedLesson =
    selectedItem?.type === "lesson" ? lessons.find((lesson) => lesson.id === selectedItem.id) ?? null : null;
  const selectedSlide =
    selectedItem?.type === "slide" ? slides.find((slide) => slide.id === selectedItem.id) ?? null : null;
  const totalItems = filteredLessons.length + filteredSlides.length;

  if (selectedLesson) {
    return (
      <LessonDetailScreen
        lesson={selectedLesson}
        subjectLabel={currentSubject.label}
        onBack={() => setSelectedItem(null)}
        onStartQuiz={onStartQuiz}
        onHome={onHome}
        onHistory={onHistory}
      />
    );
  }

  if (selectedSlide) {
    return (
      <SlideDetailScreen
        slide={selectedSlide}
        subjectLabel={currentSubject.label}
        onBack={() => setSelectedItem(null)}
        onStartQuiz={onStartQuiz}
        onHome={onHome}
        onHistory={onHistory}
      />
    );
  }

  return (
    <div className="student-screen study-screen">
      <ScreenHeader title="Bài học" subtitle={currentSubject.label} onBack={onBack} />

      <label className="study-search">
        <span>
          <Icon name="search" />
          Tìm bài học
        </span>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nhập tên bài hoặc từ khóa..." />
      </label>

      <section className="managed-study-section">
        <div className="section-heading">
          <h2>Danh sách ôn tập</h2>
          <small>{totalItems} mục</small>
        </div>
        {totalItems === 0 ? (
          <div className="study-empty-state">
            <Icon name="book" />
            <strong>Chưa có bài học phù hợp</strong>
            <p>Admin hoặc người chỉnh sửa có thể thêm bài học và tài liệu trong khu vực quản trị.</p>
          </div>
        ) : (
          <div className="managed-study-list">
            {filteredLessons.map((lesson, index) => (
              <article className="managed-study-card" key={lesson.id}>
                <button type="button" onClick={() => setSelectedItem({ type: "lesson", id: lesson.id })}>
                  <span className="lesson-card-index">{String(index + 1).padStart(2, "0")}</span>
                  <span className="lesson-card-body">
                    <small>{currentSubject.label}</small>
                    <strong>{lesson.title}</strong>
                    <em>{lesson.summary || summarizeLessonContent(lesson.content)}</em>
                  </span>
                  <span className="lesson-card-meta">
                    {lesson.attachments?.length ? (
                      <span>{lesson.attachments.length} tài liệu</span>
                    ) : (
                      <span>{lesson.content ? "Bài đọc" : "Đang cập nhật"}</span>
                    )}
                    <b>
                      Mở bài
                      <Icon name="arrowLeft" />
                    </b>
                  </span>
                </button>
              </article>
            ))}
            {filteredSlides.map((slide, index) => (
              <article className="managed-study-card slide-study-card" key={slide.id}>
                <button type="button" onClick={() => setSelectedItem({ type: "slide", id: slide.id })}>
                  <span className="lesson-card-index">{String(filteredLessons.length + index + 1).padStart(2, "0")}</span>
                  <span className="lesson-card-body">
                    <small>{currentSubject.label} · PDF</small>
                    <strong>{slide.title}</strong>
                    <em>{slide.fileName}</em>
                  </span>
                  <span className="lesson-card-meta">
                    <span>{formatFileSize(slide.size)}</span>
                    <b>
                      Mở PDF
                      <Icon name="fileText" />
                    </b>
                  </span>
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <button className="sticky-primary" type="button" onClick={onStartQuiz}>
        Làm bài kiểm tra
      </button>

      <BottomNav active="study" onHome={onHome} onStudy={() => undefined} onTest={onStartQuiz} onProfile={onHistory} />
    </div>
  );
}

function SlideDetailScreen({
  slide,
  subjectLabel,
  onBack,
  onStartQuiz,
  onHome,
  onHistory
}: {
  slide: StudySlide;
  subjectLabel: string;
  onBack: () => void;
  onStartQuiz: () => void;
  onHome: () => void;
  onHistory: () => void;
}) {
  const viewUrl = apiAssetUrl(`${slide.viewUrl}?v=${encodeURIComponent(slide.updatedAt)}`);
  const downloadUrl = apiAssetUrl(slide.downloadUrl);

  return (
    <div className="student-screen study-screen lesson-detail-screen">
      <ScreenHeader title="Slide bài giảng" subtitle={subjectLabel} onBack={onBack} />

      <article className="lesson-detail-card slide-detail-card">
        <div className="lesson-detail-kicker">
          <Icon name="fileText" />
          <span>{subjectLabel}</span>
        </div>
        <h1>{slide.title}</h1>
        <p className="lesson-detail-summary">{formatFileSize(slide.size)}</p>

        <div className="slide-detail-actions">
          <a className="slide-download-button" href={downloadUrl}>
            <Icon name="download" />
            Tải PDF
          </a>
          <a className="slide-open-link" href={viewUrl} target="_blank" rel="noreferrer">
            Mở tab mới
          </a>
        </div>

        <div className="pdf-viewer-shell">
          <iframe title={slide.title} src={viewUrl} loading="lazy" />
        </div>
      </article>

      <button className="sticky-primary" type="button" onClick={onStartQuiz}>
        Làm bài kiểm tra
      </button>

      <BottomNav active="study" onHome={onHome} onStudy={onBack} onTest={onStartQuiz} onProfile={onHistory} />
    </div>
  );
}

function LessonDetailScreen({
  lesson,
  subjectLabel,
  onBack,
  onStartQuiz,
  onHome,
  onHistory
}: {
  lesson: StudyLesson;
  subjectLabel: string;
  onBack: () => void;
  onStartQuiz: () => void;
  onHome: () => void;
  onHistory: () => void;
}) {
  return (
    <div className="student-screen study-screen lesson-detail-screen">
      <ScreenHeader title="Chi tiết bài học" subtitle={subjectLabel} onBack={onBack} />

      <article className="lesson-detail-card">
        <div className="lesson-detail-kicker">
          <Icon name="book" />
          <span>{subjectLabel}</span>
        </div>
        <h1>{lesson.title}</h1>
        {lesson.summary && <p className="lesson-detail-summary">{lesson.summary}</p>}

        {lesson.attachments?.length > 0 && <AttachmentGallery lesson={lesson} />}

        {lesson.content ? (
          <div className="lesson-detail-content">
            <RichQuestionContent content={lesson.content} />
          </div>
        ) : (
          <div className="study-empty-state compact">
            <Icon name="fileText" />
            <strong>Bài học này đang dùng tài liệu đính kèm</strong>
            <p>Nội dung chữ sẽ hiển thị tại đây khi người chỉnh sửa bổ sung.</p>
          </div>
        )}
      </article>

      <button className="sticky-primary" type="button" onClick={onStartQuiz}>
        Làm bài kiểm tra
      </button>

      <BottomNav active="study" onHome={onHome} onStudy={onBack} onTest={onStartQuiz} onProfile={onHistory} />
    </div>
  );
}

function AttachmentGallery({ lesson }: { lesson: StudyLesson }) {
  return (
    <section className="attachment-gallery" aria-label="Tài liệu bài học">
      {lesson.attachments.map((attachment) => (
        <AttachmentPreview key={attachment.id} lessonId={lesson.id} attachment={attachment} />
      ))}
    </section>
  );
}

function AttachmentPreview({ lessonId, attachment }: { lessonId: number; attachment: StudyLessonAttachment }) {
  const url = apiAssetUrl(`/api/study-lessons/${lessonId}/attachments/${attachment.id}`);

  if (attachment.kind === "image") {
    return (
      <figure className="attachment-preview image-preview">
        <img src={url} alt={attachment.fileName} loading="lazy" />
        <figcaption>{attachment.fileName}</figcaption>
      </figure>
    );
  }

  if (attachment.kind === "video") {
    return (
      <figure className="attachment-preview media-preview">
        <video controls preload="metadata" src={url} />
        <figcaption>{attachment.fileName}</figcaption>
      </figure>
    );
  }

  if (attachment.kind === "audio") {
    return (
      <figure className="attachment-preview media-preview">
        <audio controls src={url} />
        <figcaption>{attachment.fileName}</figcaption>
      </figure>
    );
  }

  return (
    <a className="attachment-file-link" href={url} target="_blank" rel="noreferrer">
      <span>
        <Icon name={attachment.kind === "pdf" ? "fileText" : "file"} />
      </span>
      <strong>{attachment.fileName}</strong>
      <small>{formatFileSize(attachment.size)}</small>
    </a>
  );
}

export function QuizScreen({
  question,
  index,
  total,
  selectedOptionId,
  checkedAnswer,
  feedback,
  busy,
  onSelect,
  onBack,
  onExit,
  onNext
}: {
  question: Question;
  index: number;
  total: number;
  selectedOptionId?: number;
  checkedAnswer?: {
    selectedOptionId: number;
    correctOptionId: number;
    isCorrect: boolean;
  };
  feedback: "correct" | "wrong" | null;
  busy: boolean;
  onSelect: (optionId: number) => void;
  onBack: () => void;
  onExit: () => void;
  onNext: () => void;
}) {
  const isAnswered = Boolean(checkedAnswer);
  const progress = Math.round(((index + 1) / total) * 100);

  function getOptionState(optionId: number) {
    if (checkedAnswer) {
      if (optionId === checkedAnswer.correctOptionId) {
        return "correct";
      }

      if (!checkedAnswer.isCorrect && optionId === checkedAnswer.selectedOptionId) {
        return "wrong";
      }

      return "";
    }

    return selectedOptionId === optionId ? "selected" : "";
  }

  return (
    <div className="student-screen quiz-screen">
      <header className="quiz-top">
        <button className="icon-button" type="button" onClick={index === 0 ? onExit : onBack} aria-label={index === 0 ? "Thoát bài kiểm tra" : "Câu trước"}>
          <Icon name="arrowLeft" />
        </button>
        <strong>
          {index + 1}/{total}
        </strong>
        <button className="quiz-exit-button" type="button" onClick={onExit}>
          <Icon name="home" />
          <span>Thoát</span>
        </button>
      </header>

      <div className="quiz-meter">
        <span aria-hidden="true">
          <span style={{ width: `${progress}%` }} />
        </span>
        <strong>{total - index} câu còn lại</strong>
      </div>

      <section className="question-bubble">
        <RichQuestionContent content={question.content} />
      </section>

      <div className="answer-list">
        {question.options.map((option) => {
          const optionState = getOptionState(option.id);

          return (
            <button
              className={optionState ? `answer-option ${optionState}` : "answer-option"}
              key={option.id}
              type="button"
              onClick={() => onSelect(option.id)}
              disabled={busy || isAnswered}
              aria-pressed={selectedOptionId === option.id}
            >
              <span aria-hidden="true">{optionState === "correct" ? <Icon name="check" /> : optionState === "wrong" ? <Icon name="x" /> : ""}</span>
              <strong>{option.content}</strong>
            </button>
          );
        })}
      </div>

      <div className={feedback ? `answer-feedback ${feedback}` : "answer-feedback"} role="status" aria-live="polite">
        {feedback === "correct" ? "Chính xác" : feedback === "wrong" ? "Chưa đúng" : ""}
      </div>

      <footer className="quiz-footer">
        <button type="button" onClick={onNext} disabled={!selectedOptionId || busy}>
          {index === total - 1 ? "Nộp bài" : "Tiếp theo"}
        </button>
      </footer>
    </div>
  );
}

export function ResultScreen({
  result,
  onRetry,
  onHome,
  onHistory
}: {
  result: QuizResult;
  onRetry: () => void;
  onHome: () => void;
  onHistory: () => void;
}) {
  const correctCount = result.score;
  const wrongCount = Math.max(result.total - result.score, 0);
  const scoreStyle = {
    "--score-angle": `${Math.max(0, Math.min(100, result.percentage)) * 3.6}deg`
  } as CSSProperties;

  return (
    <div className="student-screen result-screen">
      <ScreenHeader title="Kết quả bài kiểm tra" onBack={onHome} />

      <section className="result-hero">
        <div className="score-ring" style={scoreStyle}>
          <div>
            <strong>{Math.round(result.percentage)}/100</strong>
            <span>Score</span>
          </div>
        </div>
      </section>

      <section className="result-stats" aria-label="Thống kê kết quả">
        <SummaryMetric icon="check" label="Số câu đúng" value={String(correctCount)} />
        <SummaryMetric icon="x" label="Số câu sai" value={String(wrongCount)} />
        <SummaryMetric icon="clipboard" label="Tổng câu" value={String(result.total)} />
      </section>

      <div className="review-list">
        {result.answers.map((answer, index) => (
          <article className={answer.isCorrect ? "review-item good" : "review-item bad"} key={answer.questionId}>
            <span aria-hidden="true">{answer.isCorrect ? <Icon name="check" /> : <Icon name="x" />}</span>
            <div>
              <strong>
                {index + 1}. {summarizeQuestion(answer.questionContent)}
              </strong>
              {!answer.isCorrect && <p>Đáp án đúng: {answer.correctOptionContent}</p>}
            </div>
          </article>
        ))}
      </div>

      <div className="result-actions">
        <button type="button" onClick={onRetry}>
          Làm lại
        </button>
        <button className="secondary-button" type="button" onClick={onHistory}>
          Lịch sử
        </button>
        <button className="ghost-button" type="button" onClick={onHome}>
          Trang chủ
        </button>
      </div>

      <BottomNav active="test" onHome={onHome} onStudy={onHome} onTest={onRetry} onProfile={onHistory} />
    </div>
  );
}

export function HistoryScreen({
  user,
  attempts,
  onHome,
  onStudy,
  onTest,
  onManageQuestions,
  onManageStudy,
  onManageAccounts,
  onRefresh
}: {
  user: User;
  attempts: Attempt[];
  onHome: () => void;
  onStudy: () => void;
  onTest: () => void;
  onManageQuestions: () => void;
  onManageStudy: () => void;
  onManageAccounts: () => void;
  onRefresh: () => void;
}) {
  const canManageContent = user.role === "admin" || user.role === "editor";
  const canManageAccounts = user.role === "admin";

  return (
    <div className="student-screen history-screen">
      <header className="section-title">
        <div>
          <span>Cá nhân</span>
          <h2>Lịch sử làm bài</h2>
        </div>
        <button className="ghost-button" type="button" onClick={onRefresh}>
          Tải lại
        </button>
      </header>
      {canManageContent && (
        <section className="profile-admin-panel">
          <div>
            <span>Khu vực quản trị</span>
            <h3>{canManageAccounts ? "Quản lý nội dung và tài khoản" : "Quản lý nội dung học tập"}</h3>
          </div>
          <div className="profile-admin-actions">
            <button type="button" onClick={onManageQuestions}>
              Quản lý câu hỏi
            </button>
            <button className="secondary-button" type="button" onClick={onManageStudy}>
              Quản lý ôn tập
            </button>
            {canManageAccounts && (
              <button className="ghost-button" type="button" onClick={onManageAccounts}>
                Quản lý tài khoản
              </button>
            )}
          </div>
        </section>
      )}
      <div className="history-list">
        {attempts.length === 0 ? (
          <p className="empty-text">Chưa có lần làm bài nào.</p>
        ) : (
          attempts.map((attempt) => (
            <article className="history-item" key={attempt.id}>
              <div>
                <strong>
                  {attempt.score}/{attempt.total}
                </strong>
                <span>{formatDate(attempt.createdAt)}</span>
              </div>
              <p>{Math.round(attempt.percentage)}%</p>
            </article>
          ))
        )}
      </div>
      <button type="button" onClick={onHome}>
        Trang chủ
      </button>
      <BottomNav active="profile" onHome={onHome} onStudy={onStudy} onTest={onTest} onProfile={() => undefined} />
    </div>
  );
}

function BottomNav({
  active,
  onHome,
  onStudy,
  onTest,
  onProfile
}: {
  active: NavActive;
  onHome: () => void;
  onStudy: () => void;
  onTest: () => void;
  onProfile: () => void;
}) {
  const items: Array<{ id: NavActive; label: string; icon: IconName; action: () => void }> = [
    { id: "home", label: "Trang chủ", icon: "home", action: onHome },
    { id: "study", label: "Bài học", icon: "book", action: onStudy },
    { id: "test", label: "Kiểm tra", icon: "clipboard", action: onTest },
    { id: "profile", label: "Cá nhân", icon: "user", action: onProfile }
  ];

  return (
    <nav className="bottom-nav" aria-label="Điều hướng chính">
      {items.map((item) => (
        <button className={active === item.id ? "active" : ""} key={item.id} type="button" onClick={item.action}>
          <span aria-hidden="true">
            <Icon name={item.icon} />
          </span>
          <strong>{item.label}</strong>
        </button>
      ))}
    </nav>
  );
}

function ScreenHeader({ title, subtitle, onBack }: { title: string; subtitle?: string; onBack: () => void }) {
  return (
    <header className="screen-header">
      <button className="icon-button" type="button" onClick={onBack} aria-label="Quay lại">
        <Icon name="arrowLeft" />
      </button>
      <div>
        <strong>{title}</strong>
        {subtitle && <span>{subtitle}</span>}
      </div>
      <span className="screen-header-spacer" aria-hidden="true" />
    </header>
  );
}

function SummaryMetric({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <div className="summary-metric">
      <span aria-hidden="true">
        <Icon name={icon} />
      </span>
      <div>
        <strong>{value}</strong>
        <small>{label}</small>
      </div>
    </div>
  );
}

function isQuizQuestionLimitAvailable(limit: QuizQuestionLimit, totalQuestions: number | undefined) {
  if (typeof totalQuestions !== "number") {
    return true;
  }

  if (totalQuestions <= 0) {
    return false;
  }

  return limit === "all" || limit <= totalQuestions;
}

function quizLimitDescription(limit: QuizQuestionLimit, totalQuestions: number | undefined) {
  if (limit === "all") {
    return typeof totalQuestions === "number" && totalQuestions > 0 ? `${totalQuestions} câu` : "Toàn bộ câu hỏi";
  }

  if (typeof totalQuestions === "number" && totalQuestions > 0 && limit > totalQuestions) {
    return `Chỉ có ${totalQuestions} câu`;
  }

  return "Câu ngẫu nhiên";
}

function getInitial(value: string) {
  return value.trim().charAt(0).toUpperCase() || "S";
}

function summarizeQuestion(content: string) {
  const firstLine = content
    .replace(/\|/g, " ")
    .split(/\n+/)
    .map((line) => line.trim())
    .find(Boolean);
  const value = firstLine ?? "Câu hỏi ôn tập";

  return value.length > 92 ? `${value.slice(0, 89)}...` : value;
}

function summarizeLessonContent(content: string) {
  const firstLine = content
    .replace(/\|/g, " ")
    .split(/\n+/)
    .map((line) => line.trim())
    .find(Boolean);

  if (!firstLine) {
    return "Bấm để xem nội dung bài học và tài liệu đính kèm.";
  }

  return firstLine.length > 118 ? `${firstLine.slice(0, 115)}...` : firstLine;
}

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }

  if (size >= 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${size} B`;
}
