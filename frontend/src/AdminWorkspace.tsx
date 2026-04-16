import type { Dispatch, FormEvent, SetStateAction } from "react";
import type { Account, Question, User } from "./api";
import { AccountForm, AdminTab, QuestionForm, emptyAccountForm, emptyQuestionForm } from "./uiTypes";

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
  onHideQuestion: (id: number) => void;
  onSaveAccount: (event: FormEvent<HTMLFormElement>) => void;
  onEditAccount: (account: Account) => void;
  onDeleteAccount: (id: string) => void;
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
            Thoát
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
  onHideQuestion
}: AdminWorkspaceProps) {
  return (
    <div className="admin-grid">
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
                <button
                  className="ghost-button compact"
                  type="button"
                  onClick={() => removeOption(index, setQuestionForm)}
                >
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
      <section className="admin-panel list-panel">
        <div className="panel-title">
          <span>Danh sách câu hỏi</span>
          <small>{questions.length} câu</small>
        </div>
        <div className="admin-list">
          {questions.map((question) => (
            <article className="admin-question-item" key={question.id}>
              <div>
                <span className={question.isActive ? "status active" : "status"}>{question.isActive ? "Hiện" : "Ẩn"}</span>
                <h3>{question.content}</h3>
                <p>Đáp án đúng: {question.options.find((option) => option.isCorrect)?.content ?? "Chưa có"}</p>
              </div>
              <div className="row-actions">
                <button className="secondary-button" type="button" onClick={() => onEditQuestion(question)}>
                  Sửa
                </button>
                <button className="ghost-button" type="button" onClick={() => onHideQuestion(question.id)}>
                  Ẩn
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
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

