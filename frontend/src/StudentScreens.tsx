import { useMemo, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import cnxhMark from "./assets/cnxh-mark.svg";
import type { Attempt, Question, QuizResult, StudyLesson, User } from "./api";
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
        <div className="student-avatar" aria-hidden="true">
          {getInitial(user.displayName)}
        </div>
        <div>
          <p>Hi, {user.displayName || "Student"}!</p>
          <span>{roleLabel(user.role)} · start your productive day</span>
        </div>
      </header>

      <section className="score-summary" aria-label="Tổng quan học tập">
        <SummaryMetric icon="★" label="Điểm gần nhất" value={latest ? `${latest.score}/${latest.total}` : "--"} />
        <SummaryMetric icon="♛" label="Điểm tốt nhất" value={bestPercentage ? `${bestPercentage}%` : "--"} />
      </section>

      <section className="subject-section">
        <div className="section-heading">
          <h2>Chọn môn học</h2>
          {(user.role === "admin" || user.role === "editor") && (
            <button className="text-link" type="button" onClick={onAdmin}>
              Quản trị
            </button>
          )}
        </div>
        <div className="subject-grid">
          {subjectOptions.map((subject) => {
            const total = subjectCounts[subject.value];
            const isLoading = total === undefined;
            const questionCount = total ?? 0;
            const studied = Math.min(studiedCounts[subject.value] ?? 0, questionCount);
            const percent = questionCount > 0 ? Math.round((studied / questionCount) * 100) : 0;

            return (
              <button className="subject-card" key={subject.value} type="button" onClick={() => onSubjectSelect(subject.value)}>
                <span className="subject-card-icon" aria-hidden="true">
                  {subject.icon}
                </span>
                <strong>{subject.label}</strong>
                <small>{isLoading ? "Đang tải..." : questionCount > 0 ? `${questionCount} câu hỏi` : "Chưa có câu hỏi"}</small>
                <span className="mini-progress" aria-hidden="true">
                  <span style={{ width: `${percent}%` }} />
                </span>
                <em>{isLoading ? "Đang đồng bộ" : questionCount > 0 ? `${studied}/${questionCount} đã ôn` : "Sẵn sàng cập nhật"}</em>
              </button>
            );
          })}
        </div>
      </section>

      <button className="home-logout-button" type="button" onClick={onLogout}>
        Đăng xuất
      </button>

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
            ◧
          </span>
          <strong>Ôn tập kiến thức</strong>
          <small>Hệ thống lại câu hỏi, đáp án đúng và phần giải thích.</small>
        </button>
        <button className="mode-card" type="button" onClick={onStartQuiz} disabled={quizBusy}>
          <span className="mode-card-icon" aria-hidden="true">
            ◷
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
                <span aria-hidden="true">›</span>
              </button>
            ))}
        </div>
      </section>

      <BottomNav active="home" onHome={onHome} onStudy={onStudy} onTest={onStartQuiz} onProfile={onHistory} />
    </div>
  );
}

export function StudyScreen({
  subject,
  lessons,
  onBack,
  onStartQuiz,
  onHome,
  onHistory
}: {
  subject: SubjectCode;
  lessons: StudyLesson[];
  questions: Question[];
  studiedQuestionIds: Set<number>;
  onMarkStudied: (questionId: number) => void;
  onBack: () => void;
  onStartQuiz: () => void;
  onHome: () => void;
  onHistory: () => void;
}) {
  const [search, setSearch] = useState("");
  const [expandedLessonId, setExpandedLessonId] = useState<number | null>(lessons[0]?.id ?? null);
  const currentSubject = getSubjectOption(subject);
  const topics = subjectStudyTopics[subject];
  const normalizedSearch = search.trim().toLowerCase();
  const filteredLessons = useMemo(
    () =>
      normalizedSearch
        ? lessons.filter((lesson) => `${lesson.title} ${lesson.summary} ${lesson.content}`.toLowerCase().includes(normalizedSearch))
        : lessons,
    [lessons, normalizedSearch]
  );

  return (
    <div className="student-screen study-screen">
      <ScreenHeader title="Ôn tập kiến thức" subtitle={currentSubject.label} onBack={onBack} />

      <label className="study-search">
        <span>Tìm bài ôn</span>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nhập từ khóa trong bài ôn..." />
      </label>

      <section className="topic-strip" aria-label="Chủ đề gợi ý">
        {topics.map((topic) => (
          <article key={topic.title}>
            <strong>{topic.title}</strong>
            <small>{topic.description}</small>
          </article>
        ))}
      </section>

      <section className="managed-study-section">
        <div className="section-heading">
          <h2>Bài ôn theo môn</h2>
          <small>{filteredLessons.length} bài</small>
        </div>
        {filteredLessons.length === 0 ? (
          <p className="empty-text">Không tìm thấy bài ôn phù hợp.</p>
        ) : (
          <div className="managed-study-list">
            {filteredLessons.map((lesson, index) => {
              const expanded = expandedLessonId === lesson.id;

              return (
                <article className={expanded ? "managed-study-card expanded" : "managed-study-card"} key={lesson.id}>
                  <button type="button" onClick={() => setExpandedLessonId((current) => (current === lesson.id ? null : lesson.id))}>
                    <span>
                      <small>
                        {currentSubject.label} · Bài {index + 1}
                      </small>
                      <strong>{lesson.title}</strong>
                      {lesson.summary && <em>{lesson.summary}</em>}
                    </span>
                    <b>{expanded ? "Thu gọn" : "Đọc bài"}</b>
                  </button>
                  {expanded && (
                    <div className="managed-study-content">
                      <RichQuestionContent content={lesson.content} />
                    </div>
                  )}
                </article>
              );
            })}
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
          ‹
        </button>
        <strong>
          {index + 1}/{total}
        </strong>
        <button className="icon-button" type="button" onClick={onExit} aria-label="Thoát bài kiểm tra">
          ⋮
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
              <span aria-hidden="true">{optionState === "correct" ? "✓" : optionState === "wrong" ? "×" : ""}</span>
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
      <ScreenHeader title="Test Results Summary" onBack={onHome} />

      <section className="result-hero">
        <div className="score-ring" style={scoreStyle}>
          <div>
            <strong>{Math.round(result.percentage)}/100</strong>
            <span>Score</span>
          </div>
        </div>
      </section>

      <section className="result-stats" aria-label="Thống kê kết quả">
        <SummaryMetric icon="✓" label="Số câu đúng" value={String(correctCount)} />
        <SummaryMetric icon="×" label="Số câu sai" value={String(wrongCount)} />
        <SummaryMetric icon="◷" label="Tổng câu" value={String(result.total)} />
      </section>

      <div className="review-list">
        {result.answers.map((answer, index) => (
          <article className={answer.isCorrect ? "review-item good" : "review-item bad"} key={answer.questionId}>
            <span aria-hidden="true">{answer.isCorrect ? "✓" : "×"}</span>
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
  const items: Array<{ id: NavActive; label: string; icon: string; action: () => void }> = [
    { id: "home", label: "Trang chủ", icon: "⌂", action: onHome },
    { id: "study", label: "Bài học", icon: "▰", action: onStudy },
    { id: "test", label: "Kiểm tra", icon: "☑", action: onTest },
    { id: "profile", label: "Cá nhân", icon: "○", action: onProfile }
  ];

  return (
    <nav className="bottom-nav" aria-label="Điều hướng chính">
      {items.map((item) => (
        <button className={active === item.id ? "active" : ""} key={item.id} type="button" onClick={item.action}>
          <span aria-hidden="true">{item.icon}</span>
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
        ‹
      </button>
      <div>
        <strong>{title}</strong>
        {subtitle && <span>{subtitle}</span>}
      </div>
      <span className="screen-header-spacer" aria-hidden="true" />
    </header>
  );
}

function SummaryMetric({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="summary-metric">
      <span aria-hidden="true">{icon}</span>
      <div>
        <strong>{value}</strong>
        <small>{label}</small>
      </div>
    </div>
  );
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
