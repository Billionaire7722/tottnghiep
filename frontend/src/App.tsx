import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AdminWorkspace } from "./AdminWorkspace";
import {
  HistoryScreen,
  LoginScreen,
  PhoneShell,
  QuizScreen,
  ResultScreen,
  StartScreen,
  TopBar
} from "./StudentScreens";
import {
  Account,
  ApiClientError,
  Attempt,
  Question,
  QuizResult,
  User,
  apiRequest
} from "./api";
import {
  AccountForm,
  AdminTab,
  ImportedQuestionForm,
  Screen,
  emptyAccountForm,
  emptyQuestionForm,
  type SubjectCode
} from "./uiTypes";

type AuthState = {
  token: string;
  user: User;
};

type ImportedQuestionDraft = Omit<ImportedQuestionForm, "subject">;

const tokenKey = "cnxh_token";
const deviceKey = "cnxh_device_id";

function App() {
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [booting, setBooting] = useState(true);
  const [screen, setScreen] = useState<Screen>("start");
  const [notice, setNotice] = useState("");
  const [loginUsername, setLoginUsername] = useState("admin");
  const [loginPassword, setLoginPassword] = useState("Admin@12345");
  const [loginBusy, setLoginBusy] = useState(false);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [quizBusy, setQuizBusy] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<SubjectCode>("dich_te");

  const [adminTab, setAdminTab] = useState<AdminTab>("questions");
  const [adminQuestions, setAdminQuestions] = useState<Question[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [questionForm, setQuestionForm] = useState(emptyQuestionForm);
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);
  const [accountForm, setAccountForm] = useState<AccountForm>(emptyAccountForm);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [adminBusy, setAdminBusy] = useState(false);
  const [importedQuestions, setImportedQuestions] = useState<ImportedQuestionForm[]>([]);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [importSubject, setImportSubject] = useState<SubjectCode>("dich_te");
  const [importBusy, setImportBusy] = useState(false);

  const authedRequest = useCallback(
    async <T,>(path: string, options: { method?: string; body?: unknown } = {}) => {
      if (!auth?.token) {
        throw new ApiClientError(401, "UNAUTHORIZED", "Vui lòng đăng nhập để tiếp tục");
      }

      return apiRequest<T>(path, {
        ...options,
        token: auth.token
      });
    },
    [auth?.token]
  );

  const clearAuth = useCallback((message?: string) => {
    localStorage.removeItem(tokenKey);
    setAuth(null);
    setScreen("start");
    setResult(null);
    setQuestions([]);

    if (message) {
      setNotice(message);
    }
  }, []);

  const handleError = useCallback(
    (error: unknown) => {
      if (error instanceof ApiClientError) {
        if (error.status === 401) {
          clearAuth(error.message);
          return;
        }

        setNotice(error.message);
        return;
      }

      setNotice("Có lỗi xảy ra, vui lòng thử lại");
    },
    [clearAuth]
  );

  useEffect(() => {
    const token = localStorage.getItem(tokenKey);

    if (!token) {
      setBooting(false);
      return;
    }

    apiRequest<{ user: User }>("/api/auth/me", { token })
      .then((data) => setAuth({ token, user: normalizeUser(data.user) }))
      .catch(() => localStorage.removeItem(tokenKey))
      .finally(() => setBooting(false));
  }, []);

  useEffect(() => {
    if (!auth?.token) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      apiRequest<{ user: User }>("/api/auth/me", { token: auth.token })
        .then((data) => setAuth((current) => (current ? { ...current, user: normalizeUser(data.user) } : current)))
        .catch(handleError);
    }, 10000);

    return () => window.clearInterval(timer);
  }, [auth?.token, handleError]);

  useEffect(() => {
    if (!notice) {
      return undefined;
    }

    const timer = window.setTimeout(() => setNotice(""), 4200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const loadAttempts = useCallback(async () => {
    try {
      const data = await authedRequest<{ attempts: Attempt[] }>("/api/results");
      setAttempts(data.attempts);
    } catch (error) {
      handleError(error);
    }
  }, [authedRequest, handleError]);

  const loadAdminData = useCallback(async () => {
    if (auth?.user.role !== "admin") {
      return;
    }

    setAdminBusy(true);

    try {
      if (adminTab === "questions") {
        const data = await authedRequest<{ questions: Question[] }>("/api/questions?includeInactive=true");
        setAdminQuestions(data.questions);
      } else {
        const data = await authedRequest<{ accounts: Account[] }>("/api/accounts");
        setAccounts(data.accounts);
      }
    } catch (error) {
      handleError(error);
    } finally {
      setAdminBusy(false);
    }
  }, [adminTab, auth?.user.role, authedRequest, handleError]);

  useEffect(() => {
    if (screen === "admin") {
      void loadAdminData();
    }
  }, [screen, loadAdminData]);

  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginBusy(true);

    try {
      const data = await apiRequest<{ token: string; user: User }>("/api/auth/login", {
        method: "POST",
        body: {
          username: loginUsername,
          password: loginPassword,
          deviceId: getDeviceId()
        }
      });

      localStorage.setItem(tokenKey, data.token);
      setAuth({ token: data.token, user: normalizeUser(data.user) });
      setScreen("start");
      setNotice("Đăng nhập thành công");
    } catch (error) {
      handleError(error);
    } finally {
      setLoginBusy(false);
    }
  }

  async function logout() {
    if (auth?.token) {
      await apiRequest("/api/auth/logout", {
        method: "POST",
        token: auth.token
      }).catch(() => undefined);
    }

    clearAuth("Đã đăng xuất");
  }

  async function startQuiz() {
    setQuizBusy(true);

    try {
      const data = await authedRequest<{ questions: Question[] }>(
        `/api/questions?subject=${encodeURIComponent(selectedSubject)}`
      );
      const usableQuestions = data.questions.filter((question) => question.options.length >= 2);
      setQuestions(usableQuestions);
      setAnswers({});
      setQuestionIndex(0);
      setResult(null);

      if (usableQuestions.length === 0) {
        setNotice("Chưa có câu hỏi khả dụng cho môn đã chọn");
        return;
      }

      setScreen("quiz");
    } catch (error) {
      handleError(error);
    } finally {
      setQuizBusy(false);
    }
  }

  async function submitQuiz() {
    const missingIndex = questions.findIndex((question) => !answers[question.id]);

    if (missingIndex >= 0) {
      setQuestionIndex(missingIndex);
      setNotice("Bạn cần chọn đáp án cho tất cả câu hỏi");
      return;
    }

    setQuizBusy(true);

    try {
      const data = await authedRequest<{ result: QuizResult }>("/api/results", {
        method: "POST",
        body: {
          answers: questions.map((question) => ({
            questionId: question.id,
            optionId: answers[question.id]
          }))
        }
      });
      setResult(data.result);
      setScreen("result");
      void loadAttempts();
    } catch (error) {
      handleError(error);
    } finally {
      setQuizBusy(false);
    }
  }

  function editQuestion(question: Question) {
    setEditingQuestionId(question.id);
    setQuestionForm({
      subject: question.subject ?? "dich_te",
      content: question.content,
      explanation: question.explanation ?? "",
      isActive: question.isActive ?? true,
      options: question.options.map((option) => ({
        content: option.content,
        isCorrect: Boolean(option.isCorrect)
      }))
    });
  }

  async function saveQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAdminBusy(true);

    try {
      const path = editingQuestionId ? `/api/questions/${editingQuestionId}` : "/api/questions";
      const data = await authedRequest<{ question: Question }>(path, {
        method: editingQuestionId ? "PUT" : "POST",
        body: questionForm
      });

      setAdminQuestions((current) => {
        if (!editingQuestionId) {
          return [data.question, ...current];
        }

        return current.map((question) => (question.id === editingQuestionId ? data.question : question));
      });
      setQuestionForm(emptyQuestionForm());
      setEditingQuestionId(null);
      setNotice(editingQuestionId ? "Đã cập nhật câu hỏi" : "Đã thêm câu hỏi");
    } catch (error) {
      handleError(error);
    } finally {
      setAdminBusy(false);
    }
  }

  async function deleteQuestionById(id: number) {
    if (!window.confirm("Xóa vĩnh viễn câu hỏi này?")) {
      return;
    }

    setAdminBusy(true);

    try {
      await authedRequest(`/api/questions/${id}`, { method: "DELETE" });
      await loadAdminData();
      setNotice("Đã xóa câu hỏi");
    } catch (error) {
      handleError(error);
    } finally {
      setAdminBusy(false);
    }
  }

  async function importQuestionFile(file: File) {
    setImportBusy(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const data = await authedRequest<{ questions: ImportedQuestionDraft[]; warnings: string[] }>("/api/questions/import", {
        method: "POST",
        body: formData
      });
      setImportedQuestions(data.questions.map((question) => ({ ...question, subject: importSubject })));
      setImportWarnings(data.warnings);
      setNotice(data.questions.length > 0 ? `Đã đọc ${data.questions.length} câu hỏi từ file` : "Không tìm thấy câu hỏi hợp lệ");
    } catch (error) {
      handleError(error);
    } finally {
      setImportBusy(false);
    }
  }

  function changeImportedQuestion(index: number, question: ImportedQuestionForm) {
    setImportedQuestions((current) => current.map((item, itemIndex) => (itemIndex === index ? question : item)));
  }

  function removeImportedQuestion(index: number) {
    setImportedQuestions((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function changeImportSubject(value: SubjectCode) {
    setImportSubject(value);
    setImportedQuestions((current) => current.map((question) => ({ ...question, subject: value })));
  }

  async function saveImportedQuestions() {
    const invalidIndex = importedQuestions.findIndex(
      (question) =>
        !question.content.trim() ||
        question.options.filter((option) => option.content.trim()).length < 2 ||
        question.options.filter((option) => option.isCorrect).length !== 1
    );

    if (invalidIndex >= 0) {
      setNotice(`Câu nháp ${invalidIndex + 1} chưa hợp lệ`);
      return;
    }

    setAdminBusy(true);

    try {
      for (const question of importedQuestions) {
        await authedRequest("/api/questions", {
          method: "POST",
          body: {
            subject: question.subject,
            content: question.content,
            explanation: question.explanation,
            isActive: question.isActive,
            options: question.options.map((option) => ({
              content: option.content,
              isCorrect: option.isCorrect
            }))
          }
        });
      }

      setImportedQuestions([]);
      setImportWarnings([]);
      await loadAdminData();
      setNotice("Đã thêm các câu hỏi từ file");
    } catch (error) {
      handleError(error);
    } finally {
      setAdminBusy(false);
    }
  }

  function editAccount(account: Account) {
    setEditingAccountId(account.id);
    setAccountForm({
      username: account.username,
      displayName: account.displayName,
      password: "",
      role: account.role,
      isActive: account.isActive
    });
  }

  async function saveAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAdminBusy(true);

    try {
      const body = editingAccountId
        ? {
            displayName: accountForm.displayName,
            password: accountForm.password,
            role: accountForm.role,
            isActive: accountForm.isActive
          }
        : accountForm;
      const path = editingAccountId ? `/api/accounts/${editingAccountId}` : "/api/accounts";
      await authedRequest(path, {
        method: editingAccountId ? "PUT" : "POST",
        body
      });

      setAccountForm(emptyAccountForm());
      setEditingAccountId(null);
      await loadAdminData();
      setNotice(editingAccountId ? "Đã cập nhật tài khoản" : "Đã tạo tài khoản");
    } catch (error) {
      handleError(error);
    } finally {
      setAdminBusy(false);
    }
  }

  async function deleteAccountById(id: string) {
    if (!window.confirm("Xóa tài khoản này? Dữ liệu bài làm cũ vẫn được giữ lại.")) {
      return;
    }

    setAdminBusy(true);

    try {
      await authedRequest(`/api/accounts/${id}`, { method: "DELETE" });
      await loadAdminData();
      setNotice("Đã xóa tài khoản");
    } catch (error) {
      handleError(error);
    } finally {
      setAdminBusy(false);
    }
  }

  if (booting) {
    return (
      <main className="app-shell">
        <section className="phone-frame">
          <div className="phone-screen center-screen">
            <div className="loader" />
            <p>Đang khởi động...</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      {auth ? (
        <section className={screen === "admin" ? "workspace workspace-wide" : "workspace"}>
          {screen !== "admin" ? (
            <PhoneShell>
              <TopBar user={auth.user} onLogout={logout} />
              {screen === "start" && (
                <StartScreen
                  user={auth.user}
                  attempts={attempts}
                  selectedSubject={selectedSubject}
                  busy={quizBusy}
                  onSubjectChange={setSelectedSubject}
                  onStart={startQuiz}
                  onHistory={() => {
                    void loadAttempts();
                    setScreen("history");
                  }}
                  onAdmin={() => setScreen("admin")}
                />
              )}
              {screen === "quiz" && questions[questionIndex] && (
                <QuizScreen
                  question={questions[questionIndex]}
                  index={questionIndex}
                  total={questions.length}
                  selectedOptionId={answers[questions[questionIndex].id]}
                  answeredCount={answeredCount}
                  busy={quizBusy}
                  onSelect={(optionId) =>
                    setAnswers((current) => ({
                      ...current,
                      [questions[questionIndex].id]: optionId
                    }))
                  }
                  onBack={() => setQuestionIndex((current) => Math.max(0, current - 1))}
                  onNext={() => {
                    if (questionIndex === questions.length - 1) {
                      void submitQuiz();
                    } else {
                      setQuestionIndex((current) => Math.min(questions.length - 1, current + 1));
                    }
                  }}
                  onHome={() => {
                    if (window.confirm("Bạn có chắc muốn quay lại trang chủ? Bài làm hiện tại sẽ không được lưu.")) {
                      setScreen("start");
                      setQuestions([]);
                      setAnswers({});
                      setQuestionIndex(0);
                    }
                  }}
                />
              )}
              {screen === "result" && result && (
                <ResultScreen
                  result={result}
                  onRetry={startQuiz}
                  onHome={() => setScreen("start")}
                  onHistory={() => {
                    void loadAttempts();
                    setScreen("history");
                  }}
                />
              )}
              {screen === "history" && (
                <HistoryScreen attempts={attempts} onHome={() => setScreen("start")} onRefresh={loadAttempts} />
              )}
            </PhoneShell>
          ) : (
            <AdminWorkspace
              tab={adminTab}
              setTab={setAdminTab}
              user={auth.user}
              questions={adminQuestions}
              accounts={accounts}
              questionForm={questionForm}
              setQuestionForm={setQuestionForm}
              editingQuestionId={editingQuestionId}
              setEditingQuestionId={setEditingQuestionId}
              accountForm={accountForm}
              setAccountForm={setAccountForm}
              editingAccountId={editingAccountId}
              setEditingAccountId={setEditingAccountId}
              busy={adminBusy}
              onBack={() => setScreen("start")}
              onLogout={logout}
              onReload={loadAdminData}
              onSaveQuestion={saveQuestion}
              onEditQuestion={editQuestion}
              onDeleteQuestion={deleteQuestionById}
              onSaveAccount={saveAccount}
              onEditAccount={editAccount}
              onDeleteAccount={deleteAccountById}
              importedQuestions={importedQuestions}
              importWarnings={importWarnings}
              importSubject={importSubject}
              importBusy={importBusy}
              onImportFile={importQuestionFile}
              onImportSubjectChange={changeImportSubject}
              onChangeImportedQuestion={changeImportedQuestion}
              onRemoveImportedQuestion={removeImportedQuestion}
              onSaveImportedQuestions={saveImportedQuestions}
            />
          )}
        </section>
      ) : (
        <LoginScreen
          username={loginUsername}
          password={loginPassword}
          busy={loginBusy}
          onUsernameChange={setLoginUsername}
          onPasswordChange={setLoginPassword}
          onSubmit={handleLogin}
        />
      )}

      {notice && <div className="toast">{notice}</div>}
    </main>
  );
}

function getDeviceId() {
  const existing = localStorage.getItem(deviceKey);

  if (existing) {
    return existing;
  }

  const generated =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  localStorage.setItem(deviceKey, generated);
  return generated;
}

function normalizeUser(user: User) {
  const displayNameLooksBroken = /[?�]|Ã|áº|á»/.test(user.displayName);

  if (user.username === "admin" && displayNameLooksBroken) {
    return {
      ...user,
      displayName: "Quản trị viên"
    };
  }

  return user;
}

export default App;
