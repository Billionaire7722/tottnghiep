import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { AdminWorkspace } from "./AdminWorkspace";
import {
  AvatarPickerDialog,
  AccountManagementScreen,
  HistoryScreen,
  LoginScreen,
  ModeScreen,
  PhoneShell,
  PoliciesScreen,
  ProfileScreen,
  QuizSetupScreen,
  QuizScreen,
  ResultScreen,
  SettingsDrawer,
  StartScreen,
  StudyScreen,
  type NavActive,
  type QuizQuestionLimit
} from "./StudentScreens";
import {
  Account,
  AccountDetail,
  ApiClientError,
  Attempt,
  Question,
  QuizResult,
  StudyLesson,
  StudySlide,
  User,
  apiRequest
} from "./api";
import { AppNotifications, type ConfirmationOptions, type ConfirmationRequest } from "./AppNotifications";
import {
  AccountForm,
  AdminTab,
  ImportedQuestionForm,
  ImportedStudyLessonForm,
  Screen,
  emptyAccountForm,
  emptyQuestionForm,
  emptyStudyLessonForm,
  subjectOptions,
  type QuestionForm,
  type StudyLessonReviewQuestionForm,
  type StudyLessonForm,
  type SubjectCode
} from "./uiTypes";

type AuthState = {
  token: string;
  user: User;
};

type ImportedQuestionDraft = Omit<ImportedQuestionForm, "subject">;
type ImportedStudyLessonDraft = Omit<ImportedStudyLessonForm, "subject">;
type CheckedAnswerState = {
  selectedOptionId: number;
  correctOptionId: number;
  isCorrect: boolean;
};
type SubjectCountMap = Partial<Record<SubjectCode, number>>;
type StudyProgressMap = Partial<Record<SubjectCode, number[]>>;

const tokenKey = "cnxh_token";
const deviceKey = "cnxh_device_id";
const studyProgressKey = "cnxh_study_progress";
const darkModeKey = "cnxh_dark_mode";

function App() {
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [booting, setBooting] = useState(true);
  const [screen, setScreen] = useState<Screen>("start");
  const [modeNavActive, setModeNavActive] = useState<NavActive>("home");
  const [notice, setNotice] = useState("");
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem(darkModeKey) === "true");
  const [confirmation, setConfirmation] = useState<ConfirmationRequest | null>(null);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [checkedAnswers, setCheckedAnswers] = useState<Record<number, CheckedAnswerState>>({});
  const [answerFeedback, setAnswerFeedback] = useState<{ questionId: number; isCorrect: boolean } | null>(null);
  const [checkingQuestionId, setCheckingQuestionId] = useState<number | null>(null);
  const [quizBusy, setQuizBusy] = useState(false);
  const [quizQuestionLimit, setQuizQuestionLimit] = useState<QuizQuestionLimit>(10);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<SubjectCode>("dich_te");
  const [subjectCounts, setSubjectCounts] = useState<SubjectCountMap>({});
  const [studyQuestions, setStudyQuestions] = useState<Question[]>([]);
  const [studentStudyLessons, setStudentStudyLessons] = useState<StudyLesson[]>([]);
  const [studentStudySlides, setStudentStudySlides] = useState<StudySlide[]>([]);
  const [studyBusy, setStudyBusy] = useState(false);
  const [studyProgress, setStudyProgress] = useState<StudyProgressMap>({});
  const questionLocksRef = useRef<Record<number, boolean>>({});

  const [adminTab, setAdminTab] = useState<AdminTab>("questions");
  const [adminQuestions, setAdminQuestions] = useState<Question[]>([]);
  const [adminStudyLessons, setAdminStudyLessons] = useState<StudyLesson[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountDetail, setAccountDetail] = useState<AccountDetail | null>(null);
  const [accountDetailBusy, setAccountDetailBusy] = useState(false);
  const [questionForm, setQuestionForm] = useState(emptyQuestionForm);
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);
  const [studyLessonForm, setStudyLessonForm] = useState<StudyLessonForm>(emptyStudyLessonForm);
  const [editingStudyLessonId, setEditingStudyLessonId] = useState<number | null>(null);
  const [accountForm, setAccountForm] = useState<AccountForm>(emptyAccountForm);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [adminBusy, setAdminBusy] = useState(false);
  const [importedQuestions, setImportedQuestions] = useState<ImportedQuestionForm[]>([]);
  const [importedStudyLessons, setImportedStudyLessons] = useState<ImportedStudyLessonForm[]>([]);
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
    setLoginUsername("");
    setLoginPassword("");
    setAvatarBusy(false);
    setAvatarPickerOpen(false);
    setSettingsDrawerOpen(false);
    setPasswordBusy(false);
    setScreen("start");
    setModeNavActive("home");
    setResult(null);
    setQuestions([]);
    setAnswers({});
    setCheckedAnswers({});
    setAnswerFeedback(null);
    setCheckingQuestionId(null);
    setQuizQuestionLimit(10);
    setStudyQuestions([]);
    setStudentStudyLessons([]);
    setStudentStudySlides([]);
    setStudyProgress({});
    setSubjectCounts({});
    questionLocksRef.current = {};

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

  const requestConfirmation = useCallback((options: ConfirmationOptions) => {
    return new Promise<boolean>((resolve) => {
      setConfirmation({
        cancelLabel: "Hủy",
        tone: "default",
        ...options,
        resolve
      });
    });
  }, []);

  const settleConfirmation = useCallback(
    (confirmed: boolean) => {
      if (!confirmation) {
        return;
      }

      confirmation.resolve(confirmed);
      setConfirmation(null);
    },
    [confirmation]
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

  useEffect(() => {
    if (!answerFeedback) {
      return undefined;
    }

    const timer = window.setTimeout(() => setAnswerFeedback(null), 1400);
    return () => window.clearTimeout(timer);
  }, [answerFeedback]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
    document.querySelector(".phone-screen")?.scrollTo({ top: 0, left: 0 });
  }, [screen, questionIndex]);

  const loadAttempts = useCallback(async () => {
    try {
      const data = await authedRequest<{ attempts: Attempt[] }>("/api/results");
      setAttempts(data.attempts);
    } catch (error) {
      handleError(error);
    }
  }, [authedRequest, handleError]);

  const loadSubjectCounts = useCallback(async () => {
    try {
      const entries = await Promise.all(
        subjectOptions.map(async (subject) => {
          const data = await authedRequest<{ questions: Question[] }>(
            `/api/questions?subject=${encodeURIComponent(subject.value)}`
          );

          return [subject.value, data.questions.filter((question) => question.options.length >= 2).length] as const;
        })
      );

      setSubjectCounts(Object.fromEntries(entries) as SubjectCountMap);
    } catch (error) {
      handleError(error);
    }
  }, [authedRequest, handleError]);

  useEffect(() => {
    if (!auth?.token) {
      return;
    }

    void loadAttempts();
    void loadSubjectCounts();
  }, [auth?.token, loadAttempts, loadSubjectCounts]);

  useEffect(() => {
    if (!auth?.user.id) {
      setStudyProgress({});
      return;
    }

    setStudyProgress(readStudyProgress(auth.user.id));
  }, [auth?.user.id]);

  const loadAdminData = useCallback(async () => {
    const canManageQuestions = auth?.user.role === "admin" || auth?.user.role === "editor";
    const canManageAccounts = auth?.user.role === "admin";

    if (!canManageQuestions) {
      return;
    }

    setAdminBusy(true);

    try {
      if (adminTab === "questions") {
        const data = await authedRequest<{ questions: Question[] }>("/api/questions?includeInactive=true");
        setAdminQuestions(data.questions);
      } else if (adminTab === "study") {
        const data = await authedRequest<{ lessons: StudyLesson[] }>("/api/study-lessons?includeInactive=true");
        setAdminStudyLessons(data.lessons);
      } else if (canManageAccounts) {
        const data = await authedRequest<{ accounts: Account[] }>("/api/accounts");
        setAccounts(data.accounts);
      } else {
        setAdminTab("questions");
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

  useEffect(() => {
    localStorage.setItem(darkModeKey, String(darkMode));
  }, [darkMode]);

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
      setLoginUsername("");
      setLoginPassword("");
      setScreen("start");
      setNotice("Đăng nhập thành công");
    } catch (error) {
      handleError(error);
    } finally {
      setLoginBusy(false);
    }
  }

  async function changeAvatar(avatarKey: string) {
    if (!auth) {
      return;
    }

    const previousUser = auth.user;
    setAvatarBusy(true);
    setAuth((current) => (current ? { ...current, user: { ...current.user, avatarKey } } : current));

    try {
      const data = await authedRequest<{ user: User }>("/api/auth/me", {
        method: "PATCH",
        body: { avatarKey }
      });

      setAuth((current) => (current ? { ...current, user: normalizeUser(data.user) } : current));
      setAvatarPickerOpen(false);
      setNotice("Đã cập nhật ảnh đại diện");
    } catch (error) {
      setAuth((current) => (current ? { ...current, user: previousUser } : current));
      handleError(error);
    } finally {
      setAvatarBusy(false);
    }
  }

  async function changePassword(input: { currentPassword: string; newPassword: string }) {
    setPasswordBusy(true);

    try {
      await authedRequest("/api/auth/password", {
        method: "PATCH",
        body: input
      });
      setNotice("Đã cập nhật mật khẩu");
      return true;
    } catch (error) {
      handleError(error);
      return false;
    } finally {
      setPasswordBusy(false);
    }
  }

  async function logout() {
    const confirmed = await requestConfirmation({
      title: "Đăng xuất khỏi tài khoản?",
      message: "Bạn sẽ cần đăng nhập lại để tiếp tục ôn tập hoặc quản trị nội dung.",
      confirmLabel: "Đăng xuất",
      cancelLabel: "Ở lại",
      tone: "danger"
    });

    if (!confirmed) {
      return;
    }

    if (auth?.token) {
      await apiRequest("/api/auth/logout", {
        method: "POST",
        token: auth.token
      }).catch(() => undefined);
    }

    clearAuth("Đã đăng xuất");
  }

  async function exitQuizWithDialog() {
    const confirmed = await requestConfirmation({
      title: "Thoát bài kiểm tra?",
      message: "Bài làm hiện tại sẽ không được lưu. Bạn sẽ quay lại trang chủ.",
      confirmLabel: "Thoát về trang chủ",
      cancelLabel: "Tiếp tục làm bài",
      tone: "danger"
    });

    if (!confirmed) {
      return;
    }

    setScreen("start");
    setQuestions([]);
    setAnswers({});
    setCheckedAnswers({});
    setAnswerFeedback(null);
    setCheckingQuestionId(null);
    setQuestionIndex(0);
    questionLocksRef.current = {};
  }

  async function startQuiz(limit: QuizQuestionLimit) {
    setQuizQuestionLimit(limit);
    setQuizBusy(true);

    try {
      const data = await authedRequest<{ questions: Question[] }>(
        `/api/questions?subject=${encodeURIComponent(selectedSubject)}`
      );
      const usableQuestions = data.questions.filter((question) => question.options.length >= 2);
      const selectedQuestions = chooseQuizQuestions(usableQuestions, limit);
      setQuestions(selectedQuestions);
      setAnswers({});
      setCheckedAnswers({});
      setAnswerFeedback(null);
      setCheckingQuestionId(null);
      setQuestionIndex(0);
      setResult(null);
      questionLocksRef.current = {};
      setSubjectCounts((current) => ({
        ...current,
        [selectedSubject]: usableQuestions.length
      }));

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

  async function startStudy() {
    setStudyBusy(true);

    try {
      const [lessonData, slideData] = await Promise.all([
        authedRequest<{ lessons: StudyLesson[] }>(`/api/study-lessons?subject=${encodeURIComponent(selectedSubject)}`),
        authedRequest<{ slides: StudySlide[] }>(`/api/slides?subject=${encodeURIComponent(selectedSubject)}`)
      ]);
      setStudyQuestions([]);
      setStudentStudyLessons(lessonData.lessons);
      setStudentStudySlides(slideData.slides);

      if (lessonData.lessons.length === 0 && slideData.slides.length === 0) {
        setNotice("Chưa có nội dung ôn tập khả dụng cho môn đã chọn");
        return;
      }

      setScreen("study");
    } catch (error) {
      handleError(error);
    } finally {
      setStudyBusy(false);
    }
  }

  function openSubject(subject: SubjectCode) {
    setSelectedSubject(subject);
    if (screen === "start") {
      setModeNavActive("home");
    }
    setScreen("mode");
  }

  function openModeFromNav(active: "study" | "test") {
    setModeNavActive(active);
    setScreen("mode");
  }

  function openQuizSetup() {
    const totalQuestions = subjectCounts[selectedSubject];
    setQuizQuestionLimit((current) => normalizeQuizQuestionLimit(current, totalQuestions));
    setScreen("quizSetup");
  }

  function goHome() {
    setScreen("start");
    setModeNavActive("home");
    setSettingsDrawerOpen(false);
    setAnswerFeedback(null);
  }

  function openProfile() {
    setSettingsDrawerOpen(false);
    setScreen("profile");
  }

  function openHistory() {
    void loadAttempts();
    setSettingsDrawerOpen(false);
    setScreen("history");
  }

  function openAdminTab(tab: AdminTab) {
    setAdminTab(tab);
    setSettingsDrawerOpen(false);
    setScreen("admin");
  }

  function markQuestionStudied(questionId: number) {
    if (!auth?.user.id) {
      return;
    }

    setStudyProgress((current) => {
      const existing = current[selectedSubject] ?? [];

      if (existing.includes(questionId)) {
        return current;
      }

      const next = {
        ...current,
        [selectedSubject]: [...existing, questionId]
      };
      localStorage.setItem(`${studyProgressKey}:${auth.user.id}`, JSON.stringify(next));
      return next;
    });
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

  async function selectAnswer(optionId: number) {
    const question = questions[questionIndex];

    if (!question || checkedAnswers[question.id] || questionLocksRef.current[question.id]) {
      return;
    }

    questionLocksRef.current[question.id] = true;
    setCheckingQuestionId(question.id);
    setAnswers((current) => ({
      ...current,
      [question.id]: optionId
    }));
    setAnswerFeedback(null);

    try {
      const data = await authedRequest<{ isCorrect: boolean; correctOptionId: number }>("/api/questions/check", {
        method: "POST",
        body: {
          questionId: question.id,
          optionId
        }
      });

      setCheckedAnswers((current) => ({
        ...current,
        [question.id]: {
          selectedOptionId: optionId,
          correctOptionId: data.correctOptionId,
          isCorrect: data.isCorrect
        }
      }));
      setAnswerFeedback({ questionId: question.id, isCorrect: data.isCorrect });
    } catch (error) {
      setAnswers((current) => {
        const next = { ...current };
        delete next[question.id];
        return next;
      });
      handleError(error);
    } finally {
      delete questionLocksRef.current[question.id];
      setCheckingQuestionId((current) => (current === question.id ? null : current));
    }
  }

  function editQuestion(question: Question) {
    setEditingQuestionId(question.id);
    setQuestionForm(questionToForm(question));
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
    const confirmed = await requestConfirmation({
      title: "Xóa câu hỏi?",
      message: "Câu hỏi này sẽ bị xóa vĩnh viễn và không thể khôi phục từ giao diện quản trị.",
      confirmLabel: "Xóa câu hỏi",
      tone: "danger"
    });

    if (!confirmed) {
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

  async function approveQuestionsByIds(ids: number[]) {
    const selectedIds = new Set(ids);
    const selectedQuestions = adminQuestions.filter((question) => selectedIds.has(question.id));
    const publishableQuestions = selectedQuestions.filter(canPublishQuestion);
    const skippedCount = selectedQuestions.length - publishableQuestions.length;

    if (publishableQuestions.length === 0) {
      setNotice("Chưa có câu hỏi nào đủ đáp án để duyệt. Hãy sửa đáp án hoặc xóa các câu này.");
      return;
    }

    const confirmed = await requestConfirmation({
      title: "Duyệt tất cả câu hỏi đủ điều kiện?",
      message:
        skippedCount > 0
          ? `Hệ thống sẽ duyệt ${publishableQuestions.length} câu đủ đáp án. ${skippedCount} câu còn thiếu đáp án vẫn ở hàng chờ.`
          : `Hệ thống sẽ duyệt ${publishableQuestions.length} câu hỏi và hiển thị cho người học.`,
      confirmLabel: "Duyệt tất cả"
    });

    if (!confirmed) {
      return;
    }

    setAdminBusy(true);

    try {
      await Promise.all(
        publishableQuestions.map((question) =>
          authedRequest<{ question: Question }>(`/api/questions/${question.id}`, {
            method: "PUT",
            body: questionToForm(question, { isActive: true })
          })
        )
      );
      await loadAdminData();
      setNotice(
        skippedCount > 0
          ? `Đã duyệt ${publishableQuestions.length} câu. ${skippedCount} câu còn thiếu đáp án.`
          : `Đã duyệt ${publishableQuestions.length} câu hỏi`
      );
    } catch (error) {
      handleError(error);
    } finally {
      setAdminBusy(false);
    }
  }

  async function deleteQuestionsByIds(ids: number[]) {
    const uniqueIds = [...new Set(ids)];

    if (uniqueIds.length === 0) {
      return;
    }

    const confirmed = await requestConfirmation({
      title: "Xóa tất cả câu hỏi đợi sửa?",
      message: `${uniqueIds.length} câu hỏi sẽ bị xóa vĩnh viễn. Thao tác này không thể khôi phục.`,
      confirmLabel: "Xóa tất cả",
      tone: "danger"
    });

    if (!confirmed) {
      return;
    }

    setAdminBusy(true);

    try {
      await Promise.all(uniqueIds.map((id) => authedRequest(`/api/questions/${id}`, { method: "DELETE" })));
      await loadAdminData();
      setNotice(`Đã xóa ${uniqueIds.length} câu hỏi đợi sửa`);
    } catch (error) {
      handleError(error);
    } finally {
      setAdminBusy(false);
    }
  }

  function editStudyLesson(lesson: StudyLesson) {
    setEditingStudyLessonId(lesson.id);
    setStudyLessonForm({
      subject: lesson.subject,
      title: lesson.title,
      summary: lesson.summary ?? "",
      content: lesson.content,
      isActive: lesson.isActive ?? true
    });
  }

  async function saveStudyLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAdminBusy(true);

    try {
      const path = editingStudyLessonId ? `/api/study-lessons/${editingStudyLessonId}` : "/api/study-lessons";
      const data = await authedRequest<{ lesson: StudyLesson }>(path, {
        method: editingStudyLessonId ? "PUT" : "POST",
        body: studyLessonForm
      });

      setAdminStudyLessons((current) => {
        if (!editingStudyLessonId) {
          return [data.lesson, ...current];
        }

        return current.map((lesson) => (lesson.id === editingStudyLessonId ? data.lesson : lesson));
      });
      setStudyLessonForm(emptyStudyLessonForm());
      setEditingStudyLessonId(null);
      setNotice(editingStudyLessonId ? "Đã cập nhật bài ôn tập" : "Đã thêm bài ôn tập");
    } catch (error) {
      handleError(error);
    } finally {
      setAdminBusy(false);
    }
  }

  async function deleteStudyLessonById(id: number) {
    const confirmed = await requestConfirmation({
      title: "Xóa bài ôn tập?",
      message: "Bài ôn tập này sẽ bị xóa vĩnh viễn khỏi danh sách học tập.",
      confirmLabel: "Xóa bài ôn tập",
      tone: "danger"
    });

    if (!confirmed) {
      return;
    }

    setAdminBusy(true);

    try {
      await authedRequest(`/api/study-lessons/${id}`, { method: "DELETE" });
      setAdminStudyLessons((current) => current.filter((lesson) => lesson.id !== id));
      setNotice("Đã xóa bài ôn tập");
    } catch (error) {
      handleError(error);
    } finally {
      setAdminBusy(false);
    }
  }

  async function uploadStudyLessonAttachment(lessonId: number, file: File) {
    setAdminBusy(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const data = await authedRequest<{ lesson: StudyLesson }>(`/api/study-lessons/${lessonId}/attachments`, {
        method: "POST",
        body: formData
      });

      setAdminStudyLessons((current) => current.map((lesson) => (lesson.id === lessonId ? data.lesson : lesson)));
      setNotice("Đã tải file lên bài học");
    } catch (error) {
      handleError(error);
    } finally {
      setAdminBusy(false);
    }
  }

  async function deleteStudyLessonAttachment(lessonId: number, attachmentId: string) {
    const confirmed = await requestConfirmation({
      title: "Xóa file đính kèm?",
      message: "File này sẽ bị gỡ khỏi bài học và học viên sẽ không còn mở được tài liệu này.",
      confirmLabel: "Xóa file",
      tone: "danger"
    });

    if (!confirmed) {
      return;
    }

    setAdminBusy(true);

    try {
      await authedRequest(`/api/study-lessons/${lessonId}/attachments/${attachmentId}`, { method: "DELETE" });
      const data = await authedRequest<{ lesson: StudyLesson }>(`/api/study-lessons/${lessonId}`);
      setAdminStudyLessons((current) => current.map((lesson) => (lesson.id === lessonId ? data.lesson : lesson)));
      setNotice("Đã xóa file đính kèm");
    } catch (error) {
      handleError(error);
    } finally {
      setAdminBusy(false);
    }
  }

  async function addStudyLessonReviewQuestion(lessonId: number, input: StudyLessonReviewQuestionForm) {
    setAdminBusy(true);

    try {
      const data = await authedRequest<{ lesson: StudyLesson }>(`/api/study-lessons/${lessonId}/review-questions`, {
        method: "POST",
        body: input
      });
      setAdminStudyLessons((current) => current.map((lesson) => (lesson.id === lessonId ? data.lesson : lesson)));
      setNotice("Đã thêm câu hỏi ôn tập");
    } catch (error) {
      handleError(error);
    } finally {
      setAdminBusy(false);
    }
  }

  async function updateStudyLessonReviewQuestion(
    lessonId: number,
    questionId: number,
    input: StudyLessonReviewQuestionForm
  ) {
    setAdminBusy(true);

    try {
      const data = await authedRequest<{ lesson: StudyLesson }>(
        `/api/study-lessons/${lessonId}/review-questions/${questionId}`,
        {
          method: "PUT",
          body: input
        }
      );
      setAdminStudyLessons((current) => current.map((lesson) => (lesson.id === lessonId ? data.lesson : lesson)));
      setNotice("Đã cập nhật câu hỏi ôn tập");
    } catch (error) {
      handleError(error);
    } finally {
      setAdminBusy(false);
    }
  }

  async function deleteStudyLessonReviewQuestion(lessonId: number, questionId: number) {
    const confirmed = await requestConfirmation({
      title: "Xóa câu hỏi ôn tập?",
      message: "Câu hỏi này sẽ không còn hiển thị trong phần ôn tập của bài học.",
      confirmLabel: "Xóa câu hỏi",
      tone: "danger"
    });

    if (!confirmed) {
      return;
    }

    setAdminBusy(true);

    try {
      await authedRequest(`/api/study-lessons/${lessonId}/review-questions/${questionId}`, { method: "DELETE" });
      const data = await authedRequest<{ lesson: StudyLesson }>(`/api/study-lessons/${lessonId}`);
      setAdminStudyLessons((current) => current.map((lesson) => (lesson.id === lessonId ? data.lesson : lesson)));
      setNotice("Đã xóa câu hỏi ôn tập");
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
      formData.append("subject", importSubject);
      const data = await authedRequest<{
        questions: ImportedQuestionDraft[];
        lessons: ImportedStudyLessonDraft[];
        warnings: string[];
      }>("/api/content/import", {
        method: "POST",
        body: formData
      });
      setImportedQuestions(data.questions.map((question) => ({ ...question, subject: importSubject })));
      setImportedStudyLessons([]);
      setImportWarnings(data.warnings);
      setNotice(
        data.questions.length > 0
          ? `Đã đọc ${data.questions.length} câu hỏi từ file`
          : "Không tìm thấy nội dung mới hợp lệ"
      );
    } catch (error) {
      handleError(error);
    } finally {
      setImportBusy(false);
    }
  }

  async function importQuestionText(text: string) {
    setImportBusy(true);

    try {
      const data = await authedRequest<{ questions: ImportedQuestionDraft[]; warnings: string[] }>("/api/questions/parse", {
        method: "POST",
        body: {
          subject: importSubject,
          text
        }
      });
      setImportedQuestions(data.questions.map((question) => ({ ...question, subject: importSubject })));
      setImportedStudyLessons([]);
      setImportWarnings(data.warnings);
      setNotice(data.questions.length > 0 ? `Đã quét ${data.questions.length} câu hỏi từ văn bản` : "Không tìm thấy câu hỏi mới hợp lệ");
    } catch (error) {
      handleError(error);
    } finally {
      setImportBusy(false);
    }
  }

  function changeImportedQuestion(index: number, question: ImportedQuestionForm) {
    setImportedQuestions((current) => current.map((item, itemIndex) => (itemIndex === index ? question : item)));
  }

  function changeImportedStudyLesson(index: number, lesson: ImportedStudyLessonForm) {
    setImportedStudyLessons((current) => current.map((item, itemIndex) => (itemIndex === index ? lesson : item)));
  }

  function removeImportedQuestion(index: number) {
    setImportedQuestions((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function removeImportedStudyLesson(index: number) {
    setImportedStudyLessons((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function changeImportSubject(value: SubjectCode) {
    setImportSubject(value);
    setImportedQuestions((current) => current.map((question) => ({ ...question, subject: value })));
    setImportedStudyLessons((current) => current.map((lesson) => ({ ...lesson, subject: value })));
  }

  async function saveImportedQuestions() {
    const invalidIndex = importedQuestions.findIndex((question) => !question.content.trim());

    if (invalidIndex >= 0) {
      setNotice(`Câu nháp ${invalidIndex + 1} chưa có nội dung câu hỏi`);
      return;
    }

    const invalidLessonIndex = importedStudyLessons.findIndex((lesson) => !lesson.title.trim() || !lesson.content.trim());

    if (invalidLessonIndex >= 0) {
      setNotice(`Bài ôn nháp ${invalidLessonIndex + 1} chưa có tiêu đề hoặc nội dung`);
      return;
    }

    setAdminBusy(true);

    try {
      let savedQuestionCount = 0;
      let savedLessonCount = 0;
      let skippedCount = 0;
      let reviewCount = 0;

      for (const question of importedQuestions) {
        const options = question.options
          .filter((option) => option.content.trim())
          .map((option) => ({
            content: option.content,
            isCorrect: option.isCorrect
          }));
        const canPublish = isQuestionPublishable(options);

        try {
          await authedRequest("/api/questions", {
            method: "POST",
            body: {
              subject: question.subject,
              content: question.content,
              explanation: question.explanation,
              isActive: Boolean(question.isActive && canPublish),
              options
            }
          });
          savedQuestionCount += 1;

          if (!canPublish) {
            reviewCount += 1;
          }
        } catch (error) {
          if (error instanceof ApiClientError && error.code === "DUPLICATE_QUESTION") {
            skippedCount += 1;
            continue;
          }

          throw error;
        }
      }

      for (const lesson of importedStudyLessons) {
        await authedRequest("/api/study-lessons", {
          method: "POST",
          body: {
            subject: lesson.subject,
            title: lesson.title,
            summary: lesson.summary,
            content: lesson.content,
            isActive: lesson.isActive
          }
        });
        savedLessonCount += 1;
      }

      setImportedQuestions([]);
      setImportedStudyLessons([]);
      setImportWarnings([]);
      await loadAdminData();
      setNotice(
        `Đã lưu ${savedQuestionCount} câu hỏi, ${savedLessonCount} bài ôn. ${reviewCount} câu vào mục cần đáp án${
          skippedCount > 0 ? `, bỏ qua ${skippedCount} câu trùng` : ""
        }`
      );
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
    const confirmed = await requestConfirmation({
      title: "Xóa tài khoản?",
      message: "Tài khoản này sẽ không còn đăng nhập được. Dữ liệu bài làm cũ vẫn được giữ lại.",
      confirmLabel: "Xóa tài khoản",
      tone: "danger"
    });

    if (!confirmed) {
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

  async function viewAccountDetail(id: string) {
    setAccountDetailBusy(true);

    try {
      const data = await authedRequest<AccountDetail>(`/api/accounts/${id}`);
      setAccountDetail(data);
    } catch (error) {
      handleError(error);
    } finally {
      setAccountDetailBusy(false);
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
    <main className={darkMode ? "app-shell dark-mode" : "app-shell"}>
      {auth ? (
        <section className={screen === "admin" ? "workspace workspace-wide" : "workspace"}>
          {screen !== "admin" ? (
            <>
              <PhoneShell>
              {screen === "start" && (
                <StartScreen
                  user={auth.user}
                  subjectCounts={subjectCounts}
                  studiedCounts={getStudiedCounts(studyProgress)}
                  onSubjectSelect={openSubject}
                  onStudyTab={() => {
                    setModeNavActive("study");
                    setScreen("mode");
                  }}
                  onTestTab={() => {
                    setModeNavActive("test");
                    setScreen("mode");
                  }}
                  onProfile={openProfile}
                  onAvatarClick={() => setAvatarPickerOpen(true)}
                />
              )}
              {screen === "mode" && (
                <ModeScreen
                  subject={selectedSubject}
                  totalQuestions={subjectCounts[selectedSubject] ?? 0}
                  studiedQuestions={studyProgress[selectedSubject]?.length ?? 0}
                  studyBusy={studyBusy}
                  quizBusy={quizBusy}
                  onBack={goHome}
                  onStudy={() => void startStudy()}
                  onStartQuiz={openQuizSetup}
                  onSubjectSelect={openSubject}
                  onHistory={openProfile}
                  onHome={goHome}
                  navActive={modeNavActive}
                />
              )}
              {screen === "quizSetup" && (
                <QuizSetupScreen
                  subject={selectedSubject}
                  totalQuestions={subjectCounts[selectedSubject]}
                  selectedLimit={quizQuestionLimit}
                  quizBusy={quizBusy}
                  onLimitChange={setQuizQuestionLimit}
                  onBack={() => setScreen("mode")}
                  onStartQuiz={(limit) => void startQuiz(limit)}
                  onHome={goHome}
                  onHistory={openProfile}
                />
              )}
              {screen === "study" && (
                <StudyScreen
                  subject={selectedSubject}
                  lessons={studentStudyLessons}
                  slides={studentStudySlides}
                  questions={studyQuestions}
                  studiedQuestionIds={new Set(studyProgress[selectedSubject] ?? [])}
                  onMarkStudied={markQuestionStudied}
                  onBack={() => setScreen("mode")}
                  onStartQuiz={openQuizSetup}
                  onHome={goHome}
                  onHistory={openProfile}
                />
              )}
              {screen === "quiz" && questions[questionIndex] && (
                <QuizScreen
                  question={questions[questionIndex]}
                  index={questionIndex}
                  total={questions.length}
                  selectedOptionId={answers[questions[questionIndex].id]}
                  checkedAnswer={checkedAnswers[questions[questionIndex].id]}
                  feedback={
                    answerFeedback?.questionId === questions[questionIndex].id
                      ? answerFeedback.isCorrect
                        ? "correct"
                        : "wrong"
                      : null
                  }
                  busy={quizBusy || checkingQuestionId === questions[questionIndex].id}
                  onSelect={(optionId) => void selectAnswer(optionId)}
                  onBack={() => {
                    setAnswerFeedback(null);
                    setQuestionIndex((current) => Math.max(0, current - 1));
                  }}
                  onExit={exitQuizWithDialog}
                  onNext={() => {
                    setAnswerFeedback(null);
                    if (questionIndex === questions.length - 1) {
                      void submitQuiz();
                    } else {
                      setQuestionIndex((current) => Math.min(questions.length - 1, current + 1));
                    }
                  }}
                />
              )}
              {screen === "result" && result && (
                <ResultScreen
                  result={result}
                  onRetry={() => void startQuiz(quizQuestionLimit)}
                  onHome={goHome}
                  onHistory={openHistory}
                  onProfile={openProfile}
                />
              )}
              {screen === "history" && (
                <HistoryScreen
                  attempts={attempts}
                  onHome={goHome}
                  onStudy={() => openModeFromNav("study")}
                  onTest={() => openModeFromNav("test")}
                  onProfile={openProfile}
                  onRefresh={loadAttempts}
                />
              )}
              {screen === "profile" && (
                <ProfileScreen
                  user={auth.user}
                  onHome={goHome}
                  onStudy={() => openModeFromNav("study")}
                  onTest={() => openModeFromNav("test")}
                  onAvatarClick={() => setAvatarPickerOpen(true)}
                  onOpenSettings={() => setSettingsDrawerOpen(true)}
                />
              )}
              {screen === "account" && (
                <AccountManagementScreen
                  busy={passwordBusy}
                  onBack={openProfile}
                  onHome={goHome}
                  onStudy={() => openModeFromNav("study")}
                  onTest={() => openModeFromNav("test")}
                  onProfile={openProfile}
                  onChangePassword={changePassword}
                />
              )}
              {screen === "policies" && (
                <PoliciesScreen
                  onBack={openProfile}
                  onHome={goHome}
                  onStudy={() => openModeFromNav("study")}
                  onTest={() => openModeFromNav("test")}
                  onProfile={openProfile}
                />
              )}
              </PhoneShell>
              <SettingsDrawer
                user={auth.user}
                open={settingsDrawerOpen}
                darkMode={darkMode}
                onClose={() => setSettingsDrawerOpen(false)}
                onAccount={() => {
                  setSettingsDrawerOpen(false);
                  setScreen("account");
                }}
                onPolicies={() => {
                  setSettingsDrawerOpen(false);
                  setScreen("policies");
                }}
                onHistory={openHistory}
                onToggleDarkMode={() => setDarkMode((current) => !current)}
                onLogout={logout}
                onManageQuestions={() => openAdminTab("questions")}
                onManageStudy={() => openAdminTab("study")}
                onManageAccounts={() => openAdminTab("accounts")}
              />
            </>
          ) : (
            <AdminWorkspace
              tab={adminTab}
              setTab={setAdminTab}
              user={auth.user}
              questions={adminQuestions}
              studyLessons={adminStudyLessons}
              accounts={accounts}
              questionForm={questionForm}
              setQuestionForm={setQuestionForm}
              editingQuestionId={editingQuestionId}
              setEditingQuestionId={setEditingQuestionId}
              studyLessonForm={studyLessonForm}
              setStudyLessonForm={setStudyLessonForm}
              editingStudyLessonId={editingStudyLessonId}
              setEditingStudyLessonId={setEditingStudyLessonId}
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
              onApproveQuestions={approveQuestionsByIds}
              onDeleteQuestions={deleteQuestionsByIds}
              onSaveStudyLesson={saveStudyLesson}
              onEditStudyLesson={editStudyLesson}
              onDeleteStudyLesson={deleteStudyLessonById}
              onUploadStudyLessonAttachment={(lessonId, file) => void uploadStudyLessonAttachment(lessonId, file)}
              onDeleteStudyLessonAttachment={(lessonId, attachmentId) => void deleteStudyLessonAttachment(lessonId, attachmentId)}
              onAddStudyLessonReviewQuestion={(lessonId, input) => void addStudyLessonReviewQuestion(lessonId, input)}
              onUpdateStudyLessonReviewQuestion={(lessonId, questionId, input) =>
                void updateStudyLessonReviewQuestion(lessonId, questionId, input)
              }
              onDeleteStudyLessonReviewQuestion={(lessonId, questionId) =>
                void deleteStudyLessonReviewQuestion(lessonId, questionId)
              }
              onSaveAccount={saveAccount}
              onEditAccount={editAccount}
              onDeleteAccount={deleteAccountById}
              importedQuestions={importedQuestions}
              importedStudyLessons={importedStudyLessons}
              importWarnings={importWarnings}
              importSubject={importSubject}
              importBusy={importBusy}
              onImportFile={importQuestionFile}
              onImportText={importQuestionText}
              onImportSubjectChange={changeImportSubject}
              onChangeImportedQuestion={changeImportedQuestion}
              onRemoveImportedQuestion={removeImportedQuestion}
              onChangeImportedStudyLesson={changeImportedStudyLesson}
              onRemoveImportedStudyLesson={removeImportedStudyLesson}
              onSaveImportedQuestions={saveImportedQuestions}
              accountDetail={accountDetail}
              accountDetailBusy={accountDetailBusy}
              onViewAccountDetail={(id) => void viewAccountDetail(id)}
              onBackToAccounts={() => setAccountDetail(null)}
              onReloadAccountDetail={() => {
                if (accountDetail?.account.id) {
                  void viewAccountDetail(accountDetail.account.id);
                }
              }}
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

      {auth && avatarPickerOpen && (
        <AvatarPickerDialog
          user={auth.user}
          busy={avatarBusy}
          onClose={() => {
            if (!avatarBusy) {
              setAvatarPickerOpen(false);
            }
          }}
          onSelect={(avatarKey) => void changeAvatar(avatarKey)}
        />
      )}

      <AppNotifications
        notice={notice}
        confirmation={confirmation}
        onCancelConfirmation={() => settleConfirmation(false)}
        onConfirmConfirmation={() => settleConfirmation(true)}
      />
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
  const normalizedUser = {
    ...user,
    avatarKey: user.avatarKey ?? null
  };

  const displayNameLooksBroken = /[?�]|Ã|áº|á»/.test(user.displayName);

  if (user.username === "admin" && displayNameLooksBroken) {
    return {
      ...normalizedUser,
      displayName: "Quản trị viên"
    };
  }

  return normalizedUser;
}

function readStudyProgress(userId: string): StudyProgressMap {
  const raw = localStorage.getItem(`${studyProgressKey}:${userId}`);

  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as StudyProgressMap;

    return subjectOptions.reduce<StudyProgressMap>((progress, subject) => {
      const ids = parsed[subject.value];

      if (Array.isArray(ids)) {
        progress[subject.value] = [...new Set(ids.filter((id) => Number.isInteger(id) && id > 0))];
      }

      return progress;
    }, {});
  } catch {
    return {};
  }
}

function getStudiedCounts(progress: StudyProgressMap): SubjectCountMap {
  return subjectOptions.reduce<SubjectCountMap>((counts, subject) => {
    counts[subject.value] = progress[subject.value]?.length ?? 0;
    return counts;
  }, {});
}

function normalizeQuizQuestionLimit(limit: QuizQuestionLimit, totalQuestions: number | undefined) {
  if (typeof totalQuestions !== "number" || totalQuestions <= 0 || limit === "all") {
    return limit;
  }

  return limit <= totalQuestions ? limit : "all";
}

function chooseQuizQuestions(questions: Question[], limit: QuizQuestionLimit) {
  const requestedCount = limit === "all" ? questions.length : limit;
  const selectedCount = Math.min(requestedCount, questions.length);

  if (selectedCount >= questions.length) {
    return questions;
  }

  return shuffleQuestions(questions).slice(0, selectedCount);
}

function shuffleQuestions(questions: Question[]) {
  const next = [...questions];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }

  return next;
}

function questionToForm(question: Question, overrides: Partial<QuestionForm> = {}): QuestionForm {
  return {
    subject: question.subject ?? "dich_te",
    content: question.content,
    explanation: question.explanation ?? "",
    isActive: question.isActive ?? true,
    options: question.options.map((option) => ({
      content: option.content,
      isCorrect: Boolean(option.isCorrect)
    })),
    ...overrides
  };
}

function canPublishQuestion(question: Question) {
  return isQuestionPublishable(question.options.map((o) => ({ content: o.content, isCorrect: Boolean(o.isCorrect) })));
}

function isQuestionPublishable(options: Array<{ content: string; isCorrect: boolean }>) {
  return options.filter((option) => option.content.trim()).length >= 2 && options.filter((option) => option.isCorrect).length === 1;
}

export default App;
