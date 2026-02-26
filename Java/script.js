document.addEventListener("DOMContentLoaded", () => {
    const USERS = {
        student: "learn123",
        admin: "videos123"
    };
    const SESSION_KEY = "learningSessionStartedAt";
    const USER_KEY = "learningUser";
    const SPECIALIZATION_KEY = "learningSpecialization";
    const SESSION_MS = 60 * 60 * 1000;
    const ACCESS_GRANTED_HOLD_MS = 350;
    const UNLOCK_ANIMATION_MS = 1700;
    const body = document.body;
    const toggle = document.getElementById("themeToggle");
    const overlay = document.getElementById("overlay");
    const loginStep = document.getElementById("loginStep");
    const quizStep = document.getElementById("quizStep");
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const openLoginButton = document.getElementById("openLoginButton");
    const loginSubmitButton = document.getElementById("loginSubmitButton");
    const logoutButton = document.getElementById("logoutButton");
    const authMessage = document.getElementById("authMessage");
    const quizMessage = document.getElementById("quizMessage");
    const specializationSection = document.getElementById("specializationSection");
    const specializationSummary = document.getElementById("specializationSummary");
    const videoList = document.getElementById("videoList");

    if (toggle) {
        if (localStorage.getItem("darkMode") === "true") {
            body.classList.add("dark");
        }

        toggle.addEventListener("click", () => {
            body.classList.toggle("dark");
            localStorage.setItem("darkMode", body.classList.contains("dark"));
        });
    }

    let relockTimerId = null;
    const scheduleRelock = (delayMs, sessionKey = SESSION_KEY) => {
        if (relockTimerId) {
            window.clearTimeout(relockTimerId);
        }
        const safeDelay = Math.max(0, delayMs);
        relockTimerId = window.setTimeout(() => {
            localStorage.removeItem(sessionKey);
            window.location.reload();
        }, safeDelay);
    };

    if (!overlay || !loginStep || !quizStep) {
        return;
    }

    const now = Date.now();
    const sessionStartedAt = Number(localStorage.getItem(SESSION_KEY));
    const activeUser = localStorage.getItem(USER_KEY);
    const savedSpecialization = localStorage.getItem(SPECIALIZATION_KEY);
    const hasValidSession = Number.isFinite(sessionStartedAt) && now - sessionStartedAt < SESSION_MS;

    const clearProgress = () => {
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(SPECIALIZATION_KEY);
    };

    const setAuthButtons = (isLoggedIn) => {
        if (openLoginButton) {
            openLoginButton.hidden = isLoggedIn;
        }
        if (logoutButton) {
            logoutButton.hidden = !isLoggedIn;
        }
    };

    const showError = (target, text) => {
        if (!target) {
            return;
        }
        target.textContent = text;
        target.classList.add("error");
    };

    const showInfo = (target, text) => {
        if (!target) {
            return;
        }
        target.textContent = text;
        target.classList.remove("error");
    };

    const clearMessage = (target) => {
        if (!target) {
            return;
        }
        target.textContent = "";
        target.classList.remove("error");
    };

    const toVideoArray = () => {
        const items = [];
        for (let i = 0; i < 26; i += 1) {
            const letter = String.fromCharCode(65 + i);
            items.push({
                id: letter,
                title: `Video ${letter}`
            });
        }
        return items;
    };

    const videos = toVideoArray();

    const addRangeScore = (scores, start, end, value) => {
        for (let i = start; i <= end; i += 1) {
            scores[i] += value;
        }
    };

    const scoreAnswers = (answers) => {
        const scores = new Array(26).fill(0);

        if (answers.q1 === "frontend") {
            addRangeScore(scores, 0, 6, 3);
        } else if (answers.q1 === "backend") {
            addRangeScore(scores, 7, 13, 3);
        } else if (answers.q1 === "design") {
            addRangeScore(scores, 14, 19, 3);
        } else if (answers.q1 === "fullstack") {
            addRangeScore(scores, 20, 25, 3);
        }

        if (answers.q2 === "quick") {
            for (let i = 0; i < 26; i += 2) {
                scores[i] += 2;
            }
        } else if (answers.q2 === "balanced") {
            addRangeScore(scores, 8, 17, 2);
        } else if (answers.q2 === "deep") {
            for (let i = 1; i < 26; i += 2) {
                scores[i] += 2;
            }
        }

        if (answers.q3 === "beginner") {
            addRangeScore(scores, 0, 8, 3);
        } else if (answers.q3 === "intermediate") {
            addRangeScore(scores, 9, 17, 3);
        } else if (answers.q3 === "advanced") {
            addRangeScore(scores, 18, 25, 3);
        }

        if (answers.q4 === "projects") {
            addRangeScore(scores, 3, 12, 2);
            addRangeScore(scores, 18, 22, 1);
        } else if (answers.q4 === "theory") {
            addRangeScore(scores, 0, 5, 1);
            addRangeScore(scores, 10, 19, 2);
        } else if (answers.q4 === "mixed") {
            addRangeScore(scores, 5, 21, 1);
        }

        if (answers.q5 === "html") {
            addRangeScore(scores, 0, 4, 4);
        } else if (answers.q5 === "css") {
            addRangeScore(scores, 5, 9, 4);
        } else if (answers.q5 === "javascript") {
            addRangeScore(scores, 10, 15, 4);
        } else if (answers.q5 === "accessibility") {
            addRangeScore(scores, 16, 20, 4);
        } else if (answers.q5 === "performance") {
            addRangeScore(scores, 21, 25, 4);
        }

        return videos
            .map((video, index) => ({ ...video, score: scores[index], index }))
            .sort((a, b) => b.score - a.score || a.index - b.index)
            .slice(0, 8);
    };

    const summarizePath = (answers) => {
        return `Focus: ${answers.q1}, level: ${answers.q3}, priority topic: ${answers.q5}. Recommended videos are ranked for this path.`;
    };

    const renderRecommendations = (specialization) => {
        if (!specializationSection || !specializationSummary || !videoList) {
            return;
        }

        specializationSection.hidden = false;
        specializationSummary.textContent = specialization.summary;
        videoList.innerHTML = "";

        specialization.recommendations.forEach((item, rank) => {
            const li = document.createElement("li");
            li.textContent = `${rank + 1}. ${item.title} (${item.id})`;
            videoList.appendChild(li);
        });
    };

    let isUnlocking = false;
    let isClosing = false;
    const hideOverlay = () => {
        overlay.hidden = true;
        overlay.classList.remove("unlocking");
        body.classList.remove("locked");
        isClosing = false;
    };

    const showOverlay = () => {
        overlay.hidden = false;
        overlay.classList.remove("unlocking");
        body.classList.add("locked");
    };

    const finishOverlay = () => {
        if (isUnlocking) {
            return;
        }
        isUnlocking = true;
        window.setTimeout(() => {
            overlay.classList.add("unlocking");
        }, ACCESS_GRANTED_HOLD_MS);
        body.classList.remove("locked");

        let overlayRemoved = false;
        const removeOverlay = () => {
            if (overlayRemoved) {
                return;
            }
            overlayRemoved = true;
            hideOverlay();
            isUnlocking = false;
        };

        overlay.addEventListener("animationend", (event) => {
            if (event.target === overlay && event.animationName === "overlayOut") {
                removeOverlay();
            }
        }, { once: true });

        // Fallback in case animation events are skipped by the browser.
        window.setTimeout(removeOverlay, UNLOCK_ANIMATION_MS);
    };

    const closeOverlayWithAnimation = () => {
        if (overlay.hidden || isUnlocking || isClosing) {
            return;
        }
        isClosing = true;
        overlay.classList.add("unlocking");
        body.classList.remove("locked");

        let overlayRemoved = false;
        const removeOverlay = () => {
            if (overlayRemoved) {
                return;
            }
            overlayRemoved = true;
            hideOverlay();
        };

        overlay.addEventListener("animationend", (event) => {
            if (event.target === overlay && event.animationName === "overlayOut") {
                removeOverlay();
            }
        }, { once: true });

        window.setTimeout(removeOverlay, 1300);
    };

    const showQuizStep = () => {
        loginStep.classList.add("hidden");
        quizStep.classList.remove("hidden");
        clearMessage(authMessage);
        clearMessage(quizMessage);
    };

    const showLoginStep = () => {
        loginStep.classList.remove("hidden");
        quizStep.classList.add("hidden");
        clearMessage(authMessage);
        clearMessage(quizMessage);
        if (usernameInput) {
            usernameInput.focus();
        }
    };

    if (!hasValidSession || !activeUser || !savedSpecialization) {
        clearProgress();
        setAuthButtons(false);
        hideOverlay();
    } else {
        scheduleRelock(SESSION_MS - (now - sessionStartedAt));
        setAuthButtons(true);
        hideOverlay();

        try {
            const specialization = JSON.parse(savedSpecialization);
            renderRecommendations(specialization);
        } catch (error) {
            clearProgress();
            setAuthButtons(false);
        }
    }

    if (openLoginButton) {
        openLoginButton.addEventListener("click", () => {
            showOverlay();
            showLoginStep();
        });
    }

    overlay.addEventListener("click", (event) => {
        // Close only when clicking backdrop, not the card content.
        if (event.target === overlay) {
            closeOverlayWithAnimation();
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeOverlayWithAnimation();
        }
    });

    if (logoutButton) {
        logoutButton.addEventListener("click", () => {
            clearProgress();
            window.location.reload();
        });
    }

    const attemptLogin = () => {
        const username = usernameInput ? usernameInput.value.trim().toLowerCase() : "";
        const password = passwordInput ? passwordInput.value : "";

        clearMessage(authMessage);

        if (!username || !password) {
            showError(authMessage, "Enter username and password.");
            return;
        }

        if (USERS[username] !== password) {
            showError(authMessage, "Invalid login. Try student / learn123.");
            return;
        }

        localStorage.setItem(SESSION_KEY, String(Date.now()));
        localStorage.setItem(USER_KEY, username);
        scheduleRelock(SESSION_MS);
        setAuthButtons(true);
        showInfo(authMessage, "Login successful.");
        if (passwordInput) {
            passwordInput.value = "";
        }
        showQuizStep();
    };

    if (loginSubmitButton) {
        loginSubmitButton.addEventListener("click", attemptLogin);
    }

    if (passwordInput) {
        passwordInput.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                attemptLogin();
            }
        });
    }

    quizStep.addEventListener("submit", (event) => {
        event.preventDefault();
        clearMessage(quizMessage);

        const q1 = document.getElementById("q1").value;
        const q2 = document.getElementById("q2").value;
        const q3 = document.getElementById("q3").value;
        const q4 = document.getElementById("q4").value;
        const q5 = document.getElementById("q5").value;

        if (!q1 || !q2 || !q3 || !q4 || !q5) {
            showError(quizMessage, "Please answer all 5 questions.");
            return;
        }

        const answers = { q1, q2, q3, q4, q5 };
        const recommendations = scoreAnswers(answers);
        const specialization = {
            answers,
            recommendations,
            summary: summarizePath(answers),
            createdAt: new Date().toISOString()
        };

        localStorage.setItem(SPECIALIZATION_KEY, JSON.stringify(specialization));
        renderRecommendations(specialization);
        showInfo(quizMessage, "Video plan created.");
        finishOverlay();
    });
});
