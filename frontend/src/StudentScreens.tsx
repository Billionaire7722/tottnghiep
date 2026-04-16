import type { FormEvent, ReactNode } from "react";
import cnxhMark from "./assets/cnxh-mark.svg";
import type { Attempt, Question, QuizResult, User } from "./api";
import { formatDate } from "./uiTypes";

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
        <form className="login-form" onSubmit={onSubmit}>
          <label>
            Tên đăng nhập
            <input value={username} onChange={(event) => onUsernameChange(event.target.value)} autoComplete="username" />
          </label>
          <label>
            Mật khẩu
            <input
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              type="password"
              autoComplete="current-password"
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

export function TopBar({ user, onLogout }: { user: User; onLogout: () => void }) {
  return (
    <header className="top-bar">
      <div>
        <strong>{user.displayName}</strong>
        <span>{user.role === "admin" ? "Quản trị" : "Người học"}</span>
      </div>
      <button className="ghost-button" type="button" onClick={onLogout}>
        Thoát
      </button>
    </header>
  );
}

export function StartScreen({
  user,
  attempts,
  busy,
  onStart,
  onHistory,
  onAdmin
}: {
  user: User;
  attempts: Attempt[];
  busy: boolean;
  onStart: () => void;
  onHistory: () => void;
  onAdmin: () => void;
}) {
  const latest = attempts[0];

  return (
    <div className="start-screen">
      <div className="brand-block">
        <img className="brand-mark" src={cnxhMark} alt="Biểu tượng CNXH" />
        <h1>CNXH</h1>
        <p>Sẵn sàng ôn tập</p>
      </div>
      <div className="start-actions">
        <button type="button" onClick={onStart} disabled={busy}>
          {busy ? "Đang tải câu hỏi" : "Bắt đầu"}
        </button>
        <button className="secondary-button" type="button" onClick={onHistory}>
          Lịch sử làm bài
        </button>
        {user.role === "admin" && (
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
    </div>
  );
}

export function QuizScreen({
  question,
  index,
  total,
  selectedOptionId,
  answeredCount,
  busy,
  onSelect,
  onBack,
  onNext
}: {
  question: Question;
  index: number;
  total: number;
  selectedOptionId?: number;
  answeredCount: number;
  busy: boolean;
  onSelect: (optionId: number) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="quiz-screen">
      <div className="quiz-progress">
        <span>{String(index + 1).padStart(2, "0")}</span>
        <small>
          {answeredCount}/{total} câu
        </small>
      </div>
      <section className="question-bubble">
        <h2>{question.content}</h2>
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
            <p>{answer.questionContent}</p>
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

