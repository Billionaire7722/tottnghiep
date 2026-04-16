import type { FormEvent, ReactNode } from "react";
import cnxhMark from "./assets/cnxh-mark.svg";
import type { Attempt, Question, QuizResult, User } from "./api";
import { RichQuestionContent } from "./RichQuestionContent";
import { SubjectPicker } from "./SubjectPicker";
import { formatDate, roleLabel, type SubjectCode } from "./uiTypes";

export function PhoneShell({ children }: { children: ReactNode }) {
  return (
    <div className="phone-frame">
      <div className="phone-speaker" />
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
      <div className="phone-speaker" />
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
  selectedSubject,
  busy,
  onSubjectChange,
  onStart,
  onHistory,
  onAdmin,
  onLogout
}: {
  user: User;
  attempts: Attempt[];
  selectedSubject: SubjectCode;
  busy: boolean;
  onSubjectChange: (value: SubjectCode) => void;
  onStart: () => void;
  onHistory: () => void;
  onAdmin: () => void;
  onLogout: () => void;
}) {
  const latest = attempts[0];

  return (
    <div className="start-screen">
      <div className="brand-block">
        <img className="brand-mark" src={cnxhMark} alt="Biểu tượng CNXH" />
        <h1>CNXH</h1>
        <p>Sẵn sàng thi tốt nghiệp</p>
      </div>
      <div className="start-actions">
        <SubjectPicker value={selectedSubject} onChange={onSubjectChange} label="Chọn môn thi" />
        <button type="button" onClick={onStart} disabled={busy}>
          {busy ? "Đang tải câu hỏi" : "Bắt đầu"}
        </button>
        <button className="secondary-button" type="button" onClick={onHistory}>
          Lịch sử làm bài
        </button>
        {(user.role === "admin" || user.role === "editor") && (
          <button className="secondary-button" type="button" onClick={onAdmin}>
            Quản trị
          </button>
        )}
      </div>
      {latest && (
        <div className="latest-score">
          <span>Lần gần nhất</span>
          <strong>
            {latest.score}/{latest.total}
          </strong>
        </div>
      )}
      <button className="home-logout-button" type="button" onClick={onLogout}>
        Đăng xuất
      </button>
      <p className="app-credit">created by VTK</p>
    </div>
  );
}

export function QuizScreen({
  question,
  index,
  total,
  selectedOptionId,
  feedback,
  busy,
  onSelect,
  onBack,
  onNext
}: {
  question: Question;
  index: number;
  total: number;
  selectedOptionId?: number;
  feedback: "correct" | "wrong" | null;
  busy: boolean;
  onSelect: (optionId: number) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="quiz-screen">
      <div className="quiz-progress">
        <span>
          Câu {index + 1}/{total}
        </span>
      </div>
      <section className="question-bubble">
        <RichQuestionContent content={question.content} />
      </section>
      <div className="answer-list">
        {question.options.map((option) => (
          <button
            className={selectedOptionId === option.id ? "answer-option selected" : "answer-option"}
            key={option.id}
            type="button"
            onClick={() => onSelect(option.id)}
          >
            <span>{option.label}</span>
            <strong>{option.content}</strong>
          </button>
        ))}
      </div>
      <div className={feedback ? `answer-feedback ${feedback}` : "answer-feedback"} role="status" aria-live="polite">
        {feedback === "correct" ? "Chính xác" : feedback === "wrong" ? "Chưa đúng" : ""}
      </div>
      <footer className="quiz-footer">
        <button className="secondary-button" type="button" onClick={onBack} disabled={index === 0 || busy}>
          Trước
        </button>
        <button type="button" onClick={onNext} disabled={!selectedOptionId || busy}>
          {index === total - 1 ? "Nộp bài" : "Tiếp tục"}
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
  return (
    <div className="result-screen">
      <div className="result-score">
        <span>Kết quả</span>
        <strong>{Math.round(result.percentage)}%</strong>
        <p>
          Đúng {result.score}/{result.total} câu
        </p>
      </div>
      <div className="review-list">
        {result.answers.map((answer, index) => (
          <article className={answer.isCorrect ? "review-item good" : "review-item bad"} key={answer.questionId}>
            <span>Câu {index + 1}</span>
            <RichQuestionContent content={answer.questionContent} />
            <strong>{answer.isCorrect ? "Đúng" : `Đáp án đúng: ${answer.correctOptionContent}`}</strong>
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
          Trang chính
        </button>
      </div>
    </div>
  );
}

export function HistoryScreen({
  attempts,
  onHome,
  onRefresh
}: {
  attempts: Attempt[];
  onHome: () => void;
  onRefresh: () => void;
}) {
  return (
    <div className="history-screen">
      <header className="section-title">
        <div>
          <span>Lịch sử</span>
          <h2>Các lần làm bài</h2>
        </div>
        <button className="ghost-button" type="button" onClick={onRefresh}>
          Tải lại
        </button>
      </header>
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
        Trang chính
      </button>
    </div>
  );
}
