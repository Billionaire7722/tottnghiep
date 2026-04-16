import { useEffect, useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import type { Account, Question, User } from "./api";
import { SubjectPicker } from "./SubjectPicker";
import {
  AccountForm,
  AdminTab,
  ImportedQuestionForm,
  QuestionForm,
  emptyAccountForm,
  emptyQuestionForm,
  subjectLabel,
  type SubjectCode
} from "./uiTypes";

const questionsPerPage = 5;

type AdminWorkspaceProps = {
  tab: AdminTab;
  setTab: (tab: AdminTab) => void;
  user: User;
  questions: Question[];
  accounts: Account[];
  questionForm: QuestionForm;
  setQuestionForm: Dispatch<SetStateAction<QuestionForm>>;
  editingQuestionId: number | null;
  setEditingQuestionId: (id: number | null) => void;
  accountForm: AccountForm;
  setAccountForm: Dispatch<SetStateAction<AccountForm>>;
  editingAccountId: string | null;
  setEditingAccountId: (id: string | null) => void;
  busy: boolean;
  onBack: () => void;
  onLogout: () => void;
  onReload: () => void;
  onSaveQuestion: (event: FormEvent<HTMLFormElement>) => void;
  onEditQuestion: (question: Question) => void;
  onDeleteQuestion: (id: number) => void;
  onSaveAccount: (event: FormEvent<HTMLFormElement>) => void;
  onEditAccount: (account: Account) => void;
  onDeleteAccount: (id: string) => void;
  importedQuestions: ImportedQuestionForm[];
  importWarnings: string[];
  importSubject: SubjectCode;
  importBusy: boolean;
  onImportFile: (file: File) => void;
  onImportSubjectChange: (value: SubjectCode) => void;
  onChangeImportedQuestion: (index: number, question: ImportedQuestionForm) => void;
  onRemoveImportedQuestion: (index: number) => void;
  onSaveImportedQuestions: () => void;
};

export function AdminWorkspace(props: AdminWorkspaceProps) {
  const { tab, setTab, user, busy, onBack, onLogout, onReload } = props;

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div>
          <span>Xin chào, {user.displayName}</span>
          <h1>Quản trị CNXH</h1>
        </div>
        <div className="admin-header-actions">
          <button className="ghost-button" type="button" onClick={onReload} disabled={busy}>
            Tải lại
          </button>
          <button className="secondary-button" type="button" onClick={onBack}>
            Màn hình học
          </button>
          <button className="ghost-button" type="button" onClick={onLogout}>
            Đăng xuất
          </button>
        </div>
      </header>
      <nav className="admin-tabs" aria-label="Khu vực quản trị">
        <button className={tab === "questions" ? "active" : ""} type="button" onClick={() => setTab("questions")}>
          Câu hỏi
        </button>
        <button className={tab === "accounts" ? "active" : ""} type="button" onClick={() => setTab("accounts")}>
          Tài khoản
        </button>
      </nav>
      {tab === "questions" ? <QuestionAdmin {...props} /> : <AccountAdmin {...props} />}
    </div>
  );
}

function QuestionAdmin({
  questions,
  questionForm,
  setQuestionForm,
  editingQuestionId,
  setEditingQuestionId,
  busy,
  onSaveQuestion,
  onEditQuestion,
  onDeleteQuestion,
  importedQuestions,
  importWarnings,
  importSubject,
  importBusy,
  onImportFile,
  onImportSubjectChange,
  onChangeImportedQuestion,
  onRemoveImportedQuestion,
  onSaveImportedQuestions
}: AdminWorkspaceProps) {
  const [questionPage, setQuestionPage] = useState(1);
  const totalQuestionPages = Math.max(1, Math.ceil(questions.length / questionsPerPage));
  const paginatedQuestions = useMemo(() => {
    const start = (questionPage - 1) * questionsPerPage;
    return questions.slice(start, start + questionsPerPage);
  }, [questionPage, questions]);
  const paginationItems = useMemo(() => getPaginationItems(questionPage, totalQuestionPages), [questionPage, totalQuestionPages]);

  useEffect(() => {
    setQuestionPage((current) => Math.min(Math.max(1, current), totalQuestionPages));
  }, [totalQuestionPages]);

  return (
    <div className="admin-grid">
      <div className="admin-left-column">
        <section className="admin-panel import-panel">
          <div className="panel-title">
            <span>Nhập câu hỏi từ file</span>
          </div>
          <SubjectPicker value={importSubject} onChange={onImportSubjectChange} label="Môn áp dụng cho file" compact />
          <label>
            Chọn file .txt, .md, .csv hoặc .docx
            <input
              type="file"
              accept=".txt,.md,.csv,.docx,text/plain,text/markdown"
              disabled={importBusy}
              onChange={(event) => {
                const file = event.target.files?.[0];

                if (file) {
                  onImportFile(file);
                  event.target.value = "";
                }
              }}
            />
          </label>
          <p className="hint-text">
            Định dạng gợi ý: Câu 1: nội dung, A. đáp án, B. đáp án, Đáp án: A, Giải thích: ...
          </p>
          {importWarnings.length > 0 && (
            <div className="warning-list">
              {importWarnings.slice(0, 4).map((warning, index) => (
                <span key={`${warning}-${index}`}>{warning}</span>
              ))}
              {importWarnings.length > 4 && <span>Và {importWarnings.length - 4} cảnh báo khác</span>}
            </div>
          )}
        </section>
        <form className="admin-panel form-panel" onSubmit={onSaveQuestion}>
          <div className="panel-title">
            <span>{editingQuestionId ? "Sửa câu hỏi" : "Thêm câu hỏi"}</span>
            {editingQuestionId && (
              <button
                className="ghost-button"
                type="button"
                onClick={() => {
                  setEditingQuestionId(null);
                  setQuestionForm(emptyQuestionForm());
                }}
              >
                Hủy sửa
              </button>
            )}
          </div>
          <SubjectPicker
            value={questionForm.subject}
            onChange={(subject) => setQuestionForm((current) => ({ ...current, subject }))}
            label="Môn học"
            compact
          />
          <label>
            Nội dung câu hỏi
            <textarea
              value={questionForm.content}
              onChange={(event) => setQuestionForm((current) => ({ ...current, content: event.target.value }))}
              rows={4}
            />
          </label>
          <label>
            Giải thích sau khi nộp bài
            <textarea
              value={questionForm.explanation}
              onChange={(event) => setQuestionForm((current) => ({ ...current, explanation: event.target.value }))}
              rows={3}
            />
          </label>
          <label className="inline-check">
            <input
              checked={questionForm.isActive}
              onChange={(event) => setQuestionForm((current) => ({ ...current, isActive: event.target.checked }))}
              type="checkbox"
            />
            Đang hiển thị trong bài ôn
          </label>
          <div className="option-editor">
            {questionForm.options.map((option, index) => (
              <div className="option-row" key={index}>
                <button
                  className={option.isCorrect ? "correct-toggle active" : "correct-toggle"}
                  type="button"
                  onClick={() =>
                    setQuestionForm((current) => ({
                      ...current,
                      options: current.options.map((item, itemIndex) => ({
                        ...item,
                        isCorrect: itemIndex === index
                      }))
                    }))
                  }
                >
                  {String.fromCharCode(65 + index)}
                </button>
                <input
                  value={option.content}
                  onChange={(event) =>
                    setQuestionForm((current) => ({
                      ...current,
                      options: current.options.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, content: event.target.value } : item
                      )
                    }))
                  }
                  placeholder="Nội dung đáp án"
                />
                {questionForm.options.length > 2 && (
                  <button className="ghost-button compact" type="button" onClick={() => removeOption(index, setQuestionForm)}>
                    Xóa
                  </button>
                )}
              </div>
            ))}
            <button
              className="secondary-button"
              type="button"
              disabled={questionForm.options.length >= 6}
              onClick={() =>
                setQuestionForm((current) => ({
                  ...current,
                  options: [...current.options, { content: "", isCorrect: false }]
                }))
              }
            >
              Thêm đáp án
            </button>
          </div>
          <button type="submit" disabled={busy}>
            {busy ? "Đang lưu" : editingQuestionId ? "Lưu thay đổi" : "Thêm câu hỏi"}
          </button>
        </form>
      </div>
      <section className="admin-panel list-panel">
        {importedQuestions.length > 0 && (
          <div className="import-preview">
            <div className="panel-title">
              <span>Câu hỏi đọc từ file</span>
              <small>{importedQuestions.length} câu nháp</small>
            </div>
            <div className="import-preview-list">
              {importedQuestions.map((question, index) => (
                <ImportedQuestionEditor
                  key={index}
                  index={index}
                  question={question}
                  onChange={(nextQuestion) => onChangeImportedQuestion(index, nextQuestion)}
                  onRemove={() => onRemoveImportedQuestion(index)}
                />
              ))}
            </div>
            <button type="button" disabled={busy || importedQuestions.length === 0} onClick={onSaveImportedQuestions}>
              Thêm tất cả câu hợp lệ
            </button>
          </div>
        )}
        <div className="panel-title">
          <span>Danh sách câu hỏi</span>
          <small>
            {questions.length} câu · 5 câu/trang
          </small>
        </div>
        {questions.length === 0 ? (
          <p className="empty-text">Chưa có câu hỏi nào.</p>
        ) : (
          <div className="admin-list">
            {paginatedQuestions.map((question) => (
              <article className="admin-question-item" key={question.id}>
                <div>
                  <div className="question-badges">
                    <span className={question.isActive ? "status active" : "status"}>{question.isActive ? "Hiện" : "Ẩn"}</span>
                    <span className="status subject-status">{subjectLabel(question.subject)}</span>
                  </div>
                  <h3>{question.content}</h3>
                  <p>Đáp án đúng: {question.options.find((option) => option.isCorrect)?.content ?? "Chưa có"}</p>
                </div>
                <div className="row-actions">
                  <button className="secondary-button" type="button" onClick={() => onEditQuestion(question)}>
                    Sửa
                  </button>
                  <button className="ghost-button" type="button" onClick={() => onDeleteQuestion(question.id)}>
                    Xóa
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
        {questions.length > questionsPerPage && (
          <nav className="pagination-bar" aria-label="Phân trang danh sách câu hỏi">
            <button className="ghost-button compact" type="button" disabled={questionPage === 1} onClick={() => setQuestionPage(1)}>
              Trang đầu
            </button>
            <button
              className="ghost-button compact"
              type="button"
              disabled={questionPage === 1}
              onClick={() => setQuestionPage((current) => Math.max(1, current - 1))}
            >
              Trước
            </button>
            <div className="pagination-pages">
              {paginationItems.map((item, index) =>
                item === "ellipsis" ? (
                  <span className="pagination-ellipsis" key={`ellipsis-${index}`}>
                    ...
                  </span>
                ) : (
                  <button
                    className={item === questionPage ? "page-button active" : "page-button"}
                    type="button"
                    key={item}
                    aria-current={item === questionPage ? "page" : undefined}
                    onClick={() => setQuestionPage(item)}
                  >
                    {item}
                  </button>
                )
              )}
            </div>
            <button
              className="ghost-button compact"
              type="button"
              disabled={questionPage === totalQuestionPages}
              onClick={() => setQuestionPage((current) => Math.min(totalQuestionPages, current + 1))}
            >
              Sau
            </button>
            <button
              className="ghost-button compact"
              type="button"
              disabled={questionPage === totalQuestionPages}
              onClick={() => setQuestionPage(totalQuestionPages)}
            >
              Trang cuối
            </button>
          </nav>
        )}
      </section>
    </div>
  );
}

function ImportedQuestionEditor({
  index,
  question,
  onChange,
  onRemove
}: {
  index: number;
  question: ImportedQuestionForm;
  onChange: (question: ImportedQuestionForm) => void;
  onRemove: () => void;
}) {
  return (
    <article className="import-draft">
      <div className="panel-title">
        <span>Câu nháp {index + 1}</span>
        <button className="ghost-button compact" type="button" onClick={onRemove}>
          Bỏ qua
        </button>
      </div>
      {question.warnings && question.warnings.length > 0 && (
        <div className="warning-list">
          {question.warnings.map((warning, warningIndex) => (
            <span key={`${warning}-${warningIndex}`}>{warning}</span>
          ))}
        </div>
      )}
      <SubjectPicker
        value={question.subject}
        onChange={(subject) => onChange({ ...question, subject })}
        label="Môn học"
        compact
      />
      <label>
        Nội dung câu hỏi
        <textarea value={question.content} rows={3} onChange={(event) => onChange({ ...question, content: event.target.value })} />
      </label>
      <label>
        Giải thích
        <textarea
          value={question.explanation}
          rows={2}
          onChange={(event) => onChange({ ...question, explanation: event.target.value })}
        />
      </label>
      <div className="option-editor">
        {question.options.map((option, optionIndex) => (
          <div className="option-row" key={optionIndex}>
            <button
              className={option.isCorrect ? "correct-toggle active" : "correct-toggle"}
              type="button"
              onClick={() =>
                onChange({
                  ...question,
                  options: question.options.map((item, itemIndex) => ({
                    ...item,
                    isCorrect: itemIndex === optionIndex
                  }))
                })
              }
            >
              {String.fromCharCode(65 + optionIndex)}
            </button>
            <input
              value={option.content}
              onChange={(event) =>
                onChange({
                  ...question,
                  options: question.options.map((item, itemIndex) =>
                    itemIndex === optionIndex ? { ...item, content: event.target.value } : item
                  )
                })
              }
            />
            {question.options.length > 2 && (
              <button
                className="ghost-button compact"
                type="button"
                onClick={() =>
                  onChange({
                    ...question,
                    options: ensureOneCorrect(question.options.filter((_, itemIndex) => itemIndex !== optionIndex))
                  })
                }
              >
                Xóa
              </button>
            )}
          </div>
        ))}
        <button
          className="secondary-button"
          type="button"
          disabled={question.options.length >= 6}
          onClick={() => onChange({ ...question, options: [...question.options, { content: "", isCorrect: false }] })}
        >
          Thêm đáp án
        </button>
      </div>
    </article>
  );
}

function AccountAdmin({
  accounts,
  accountForm,
  setAccountForm,
  editingAccountId,
  setEditingAccountId,
  busy,
  onSaveAccount,
  onEditAccount,
  onDeleteAccount
}: AdminWorkspaceProps) {
  return (
    <div className="admin-grid">
      <form className="admin-panel form-panel" onSubmit={onSaveAccount}>
        <div className="panel-title">
          <span>{editingAccountId ? "Sửa tài khoản" : "Tạo tài khoản"}</span>
          {editingAccountId && (
            <button
              className="ghost-button"
              type="button"
              onClick={() => {
                setEditingAccountId(null);
                setAccountForm(emptyAccountForm());
              }}
            >
              Hủy sửa
            </button>
          )}
        </div>
        <label>
          Tên đăng nhập
          <input
            value={accountForm.username}
            disabled={Boolean(editingAccountId)}
            onChange={(event) => setAccountForm((current) => ({ ...current, username: event.target.value }))}
          />
        </label>
        <label>
          Tên hiển thị
          <input
            value={accountForm.displayName}
            onChange={(event) => setAccountForm((current) => ({ ...current, displayName: event.target.value }))}
          />
        </label>
        <label>
          Mật khẩu {editingAccountId ? "mới" : ""}
          <input
            value={accountForm.password}
            type="password"
            onChange={(event) => setAccountForm((current) => ({ ...current, password: event.target.value }))}
            placeholder={editingAccountId ? "Bỏ trống nếu không đổi" : "Ít nhất 8 ký tự"}
          />
        </label>
        <label>
          Quyền
          <select
            value={accountForm.role}
            onChange={(event) =>
              setAccountForm((current) => ({ ...current, role: event.target.value as "admin" | "user" }))
            }
          >
            <option value="user">Người học</option>
            <option value="admin">Quản trị</option>
          </select>
        </label>
        <label className="inline-check">
          <input
            checked={accountForm.isActive}
            onChange={(event) => setAccountForm((current) => ({ ...current, isActive: event.target.checked }))}
            type="checkbox"
          />
          Cho phép đăng nhập
        </label>
        <button type="submit" disabled={busy}>
          {busy ? "Đang lưu" : editingAccountId ? "Lưu tài khoản" : "Tạo tài khoản"}
        </button>
      </form>
      <section className="admin-panel list-panel">
        <div className="panel-title">
          <span>Danh sách tài khoản</span>
          <small>{accounts.length} tài khoản</small>
        </div>
        <div className="account-table" role="table" aria-label="Danh sách tài khoản">
          <div className="account-row table-head" role="row">
            <span>Tài khoản</span>
            <span>Quyền</span>
            <span>Trạng thái</span>
            <span>Phiên</span>
            <span>Thao tác</span>
          </div>
          {accounts.map((account) => (
            <div className="account-row" role="row" key={account.id}>
              <span data-label="Tài khoản">
                <strong>{account.displayName}</strong>
                <small>{account.username}</small>
              </span>
              <span data-label="Quyền">{account.role === "admin" ? "Quản trị" : "Người học"}</span>
              <span data-label="Trạng thái">{account.isActive ? "Hoạt động" : "Đã khóa"}</span>
              <span data-label="Phiên">{account.activeSessions}</span>
              <span className="row-actions" data-label="Thao tác">
                <button className="secondary-button" type="button" onClick={() => onEditAccount(account)}>
                  Sửa
                </button>
                <button className="ghost-button" type="button" onClick={() => onDeleteAccount(account.id)}>
                  Xóa
                </button>
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ensureOneCorrect(options: QuestionForm["options"]) {
  if (options.some((option) => option.isCorrect)) {
    return options;
  }

  return options.map((option, index) => ({ ...option, isCorrect: index === 0 }));
}

function getPaginationItems(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const visiblePages = new Set([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);
  const pages = [...visiblePages]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((first, second) => first - second);
  const items: Array<number | "ellipsis"> = [];

  for (const page of pages) {
    const previous = items[items.length - 1];

    if (typeof previous === "number" && page - previous > 1) {
      items.push("ellipsis");
    }

    items.push(page);
  }

  return items;
}

function removeOption(index: number, setQuestionForm: Dispatch<SetStateAction<QuestionForm>>) {
  setQuestionForm((current) => {
    const nextOptions = current.options.filter((_, itemIndex) => itemIndex !== index);
    const hasCorrect = nextOptions.some((item) => item.isCorrect);

    return {
      ...current,
      options: hasCorrect ? nextOptions : nextOptions.map((item, itemIndex) => ({ ...item, isCorrect: itemIndex === 0 }))
    };
  });
}
