import { useEffect, useMemo, useState, type FormEvent } from "react";
import Interactive3DCard from "./Interactive3DCard";

type HealthResponse = {
  status: string;
  message: string;
};

type AuthTokenResponse = {
  access_token: string;
  token_type: string;
};

type UserResponse = {
  id: number;
  username: string;
  email: string;
  created_at: string;
};

type ModalName = "teammates" | "events" | "login" | "signup" | null;
type EventFilter = "All" | "Online" | "Offline" | "Nearby" | "Upcoming";

async function getApiErrorMessage(response: Response): Promise<string> {
  const payload: unknown = await response.json().catch(() => null);
  if (payload && typeof payload === "object" && "detail" in payload) {
    const detail = payload.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      const messages = detail
        .map((item: unknown) =>
          item && typeof item === "object" && "msg" in item &&
          typeof item.msg === "string"
            ? item.msg
            : null,
        )
        .filter((message): message is string => message !== null);
      if (messages.length > 0) return messages.join("; ");
    }
  }
  return `Request failed (${response.status})`;
}

const skills = ["AI/ML", "Web Development", "UI/UX", "Backend", "Marketing"];
const eventFilters: EventFilter[] = [
  "All",
  "Online",
  "Offline",
  "Nearby",
  "Upcoming",
];
const sampleEvents = [
  {
    name: "Build for Better Hackathon",
    date: "NOV 08",
    place: "Bengaluru · 4 km away",
    mode: "Offline",
    skill: "Product · Web",
    color: "mint",
  },
  {
    name: "AI for Everyone",
    date: "NOV 14",
    place: "Online · Global",
    mode: "Online",
    skill: "AI/ML · Python",
    color: "lilac",
  },
  {
    name: "Design × Tech Sprint",
    date: "NOV 22",
    place: "Indiranagar · 7 km away",
    mode: "Offline",
    skill: "UI/UX · Frontend",
    color: "peach",
  },
];

export default function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalName>(null);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [eventFilter, setEventFilter] = useState<EventFilter>("All");
  const [eventSearch, setEventSearch] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [formMessage, setFormMessage] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/health", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`API request failed (${response.status})`);
        }
        return (await response.json()) as HealthResponse;
      })
      .then(setHealth)
      .catch((requestError: unknown) => {
        if (requestError instanceof Error && requestError.name === "AbortError") {
          return;
        }
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to connect to the API",
        );
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!modal) return;
    const previousFocus = document.activeElement;
    document.querySelector<HTMLElement>('[role="dialog"]')?.focus();
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setModal(null);
    }
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus();
      }
    };
  }, [modal]);

  const filteredEvents = useMemo(() => {
    const query = eventSearch.trim().toLowerCase();
    return sampleEvents.filter((event) => {
      const matchesFilter =
        eventFilter === "All" ||
        eventFilter === "Upcoming" ||
        (eventFilter === "Nearby" && event.place.includes("away")) ||
        event.mode === eventFilter;
      const matchesSearch =
        !query ||
        `${event.name} ${event.place} ${event.skill}`.toLowerCase().includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [eventFilter, eventSearch]);

  function toggleSkill(skill: string) {
    setSelectedSkills((current) =>
      current.includes(skill)
        ? current.filter((item) => item !== skill)
        : [...current, skill],
    );
  }

  function openModal(nextModal: ModalName) {
    setFormMessage("");
    setAuthMessage("");
    setAuthError(false);
    setModal(nextModal);
  }

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthMessage("");
    setAuthError(false);
    setAuthLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    try {
      if (modal === "signup") {
        const username = String(formData.get("name") ?? "").trim();
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, email, password }),
        });
        if (!response.ok) {
          throw new Error(await getApiErrorMessage(response));
        }
        setAuthMessage("Account created. You can now log in with your email and password.");
        return;
      }

      if (modal !== "login") return;
      const loginResponse = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ username: email, password }),
      });
      if (!loginResponse.ok) {
        throw new Error(await getApiErrorMessage(loginResponse));
      }

      const token = (await loginResponse.json()) as AuthTokenResponse;
      const profileResponse = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token.access_token}` },
      });
      if (!profileResponse.ok) {
        throw new Error(await getApiErrorMessage(profileResponse));
      }

      const profile = (await profileResponse.json()) as UserResponse;
      sessionStorage.setItem("vibe_access_token", token.access_token);
      setAuthMessage(`Signed in as ${profile.username}.`);
    } catch (requestError: unknown) {
      setAuthError(true);
      setAuthMessage(
        requestError instanceof Error
          ? requestError.message
          : "Unable to complete the request. Please try again.",
      );
    } finally {
      setAuthLoading(false);
    }
  }

  return (
    <main className="site-shell">
      <section className="hero-image-section" id="home" aria-label="VIBE — Bring all team together">
        <img
          className="hero-reference-image"
          src="/vibe-hero-reference.png"
          alt="VIBE. Bring all team together. Explore, log in, or sign up."
          width="1365"
          height="768"
        />
        <a className="hero-image-home" href="#home" aria-label="VIBE home" />
        <button
          className="hero-image-login"
          onClick={() => openModal("login")}
          aria-label="Log in"
        />
        <button
          className="hero-image-signup"
          onClick={() => openModal("signup")}
          aria-label="Sign up"
        />
        <button
          className="hero-image-explore"
          onClick={() => setExploreOpen((open) => !open)}
          aria-expanded={exploreOpen}
          aria-controls="explore-options"
          aria-label={exploreOpen ? "Close explore options" : "Explore"}
        />
      </section>

      {exploreOpen && (
        <section className="explore-section" id="explore-options" aria-label="Explore VIBE">
          <div className="section-heading">
            <div><div className="eyebrow">PICK YOUR NEXT ADVENTURE</div><h2>There’s a place for your idea.</h2></div>
            <button className="icon-button" onClick={() => setExploreOpen(false)} aria-label="Close explore options">×</button>
          </div>
          <div className="explore-grid">
            <Interactive3DCard className="explore-card explore-events" accent="#f5b278">
              <div className="explore-art calendar-art" aria-hidden="true">
                <div className="calendar-sheet"><div className="calendar-top"><i /><i /><i /></div><div className="calendar-grid">{Array.from({ length: 12 }, (_, index) => <i key={index} className={index === 7 ? "date-highlight" : ""}>{index + 1}</i>)}</div></div>
                <span className="floating-pin">⌖</span><span className="mini-trophy">🏆</span>
              </div>
              <div className="explore-card-copy">
                <span className="card-kicker">GET OUT THERE</span>
                <h3>Discover Nearby Events</h3>
                <p>Find hackathons and competitions around you.</p>
                <button className="arrow-link" onClick={() => openModal("events")}>Explore Events <span aria-hidden="true">→</span></button>
              </div>
            </Interactive3DCard>
            <Interactive3DCard className="explore-card explore-team" accent="#b7a3ff">
              <div className="explore-art team-art" aria-hidden="true">
                <div className="puzzle-piece puzzle-one">✦</div><div className="puzzle-piece puzzle-two">◒</div>
                <span className="team-avatar team-avatar-a">A</span><span className="team-avatar team-avatar-b">J</span><span className="team-avatar team-avatar-c">M</span>
                <span className="skill-tile skill-tile-one">UI/UX</span><span className="skill-tile skill-tile-two">AI</span>
              </div>
              <div className="explore-card-copy">
                <span className="card-kicker">BETTER TOGETHER</span>
                <h3>Find Your Teammate</h3>
                <p>Build your dream team with the right people.</p>
                <button className="arrow-link" onClick={() => openModal("teammates")}>Find Teammates <span aria-hidden="true">→</span></button>
              </div>
            </Interactive3DCard>
          </div>
        </section>
      )}

      <section className="feature-section" id="features">
        <div className="section-heading feature-heading">
          <div><div className="eyebrow">A LITTLE LESS SCROLLING, A LOT MORE DOING</div><h2>Everything clicks<br className="desktop-break" /> when you find your people.</h2></div>
          <p>Big plans are better with a crew. We make the first hello a little easier.</p>
        </div>
        <div className="feature-grid">
          <Interactive3DCard className="feature-card feature-card-green" accent="#a9ef5e">
            <div className="feature-icon icon-team" aria-hidden="true"><span>✳</span><i>U</i><b>+</b></div>
            <span className="feature-number">01 / PEOPLE</span>
            <h3>Find teammates<br />who just get it.</h3>
            <p>Meet curious minds who bring the skills your idea needs.</p>
            <button className="card-cta" onClick={() => openModal("teammates")}>Find your team <span aria-hidden="true">↗</span></button>
          </Interactive3DCard>
          <Interactive3DCard className="feature-card feature-card-lilac" accent="#b6a0fa">
            <div className="feature-icon icon-events" aria-hidden="true"><span>08</span><i>✦</i></div>
            <span className="feature-number">02 / HAPPENING</span>
            <h3>Your next “what if?”<br />is on the calendar.</h3>
            <p>Hackathons, meetups, and tiny sparks worth showing up for.</p>
            <button className="card-cta" onClick={() => openModal("events")}>Browse events <span aria-hidden="true">↗</span></button>
          </Interactive3DCard>
          <Interactive3DCard className="feature-card feature-card-peach" accent="#ffb797">
            <div className="feature-icon icon-skills" aria-hidden="true"><span>✳</span><i>↗</i><b>◎</b></div>
            <span className="feature-number">03 / SKILLS</span>
            <h3>Bring your thing.<br />Learn a new one.</h3>
            <p>Find the missing skill in your crew and grow as you go.</p>
            <button className="card-cta" onClick={() => openModal("teammates")}>Find your fit <span aria-hidden="true">↗</span></button>
          </Interactive3DCard>
          <Interactive3DCard className="feature-card feature-card-blue" accent="#9bc5ff">
            <div className="feature-icon icon-progress" aria-hidden="true"><span>✦</span><i /><b /></div>
            <span className="feature-number">04 / MOMENTUM</span>
            <h3>Little wins add up<br />to big things.</h3>
            <p>Keep your ideas moving, one very satisfying milestone at a time.</p>
            <a className="card-cta" href="#community">See your progress <span aria-hidden="true">↗</span></a>
          </Interactive3DCard>
        </div>
      </section>

      <section className="recommend-section" id="discover">
        <div className="section-heading">
          <div><div className="eyebrow">A GOOD PLACE TO START</div><h2>Picked for your kind of curious.</h2></div>
          <button className="text-link button-as-link" onClick={() => openModal("events")}>See all events <span aria-hidden="true">↗</span></button>
        </div>
        <div className="recommend-grid">
          <Interactive3DCard className="recommend-card recommendation-one" accent="#f5b278">
            <div className="recommend-art recommend-art-sun" aria-hidden="true"><span>✳</span><i>↗</i></div>
            <div className="recommend-info"><span className="recommend-tag">HACKATHON · OFFLINE</span><h3>Build for Better</h3><p>Make something useful. Meet your future co-founder.</p><div className="recommend-meta"><span>📍 Bengaluru</span><span>Nov 08 · 2 days</span></div></div>
          </Interactive3DCard>
          <Interactive3DCard className="recommend-card recommendation-two" accent="#b6a0fa">
            <div className="recommend-art recommend-art-orbit" aria-hidden="true"><span>AI</span><i>✦</i><b>↗</b></div>
            <div className="recommend-info"><span className="recommend-tag">WORKSHOP · ONLINE</span><h3>AI for Everyone</h3><p>Less hype, more hands-on. Bring a question.</p><div className="recommend-meta"><span>🌐 Online</span><span>Nov 14 · 3 hours</span></div></div>
          </Interactive3DCard>
          <Interactive3DCard className="recommend-card recommendation-three" accent="#9bc5ff">
            <div className="recommend-art recommend-art-collab" aria-hidden="true"><span>✳</span><i>◒</i><b>+</b></div>
            <div className="recommend-info"><span className="recommend-tag">COMMUNITY · DESIGN</span><h3>Design × Tech Sprint</h3><p>Good ideas deserve a good first sketch.</p><div className="recommend-meta"><span>📍 Indiranagar</span><span>Nov 22 · one day</span></div></div>
          </Interactive3DCard>
        </div>
        <p className="sample-note">Sample events for preview · connect an events source to show live listings.</p>
      </section>

      <section className="community-section" id="community">
        <div className="community-copy"><div className="eyebrow">YOUR PEOPLE ARE OUT THERE</div><h2>Go from “I have an idea”<br />to “we made a thing.”</h2><p>Good things happen when good people make them together.</p><button className="button button-lime" onClick={() => openModal("signup")}>Find your people <span aria-hidden="true">↗</span></button></div>
        <div className="community-side">
          <div className="community-profiles">
            <Interactive3DCard className="profile-card profile-card-a" accent="#b9f566"><span className="profile-avatar profile-avatar-a">👩🏽‍💻</span><strong>Aria M.</strong><span>AI/ML · Bengaluru</span><span className="profile-online">● Open to building</span></Interactive3DCard>
            <Interactive3DCard className="profile-card profile-card-b" accent="#b6a0fa"><span className="profile-avatar profile-avatar-b">🧑🏻‍🎨</span><strong>Jay R.</strong><span>Product design · Remote</span><span className="profile-online">● Open to building</span></Interactive3DCard>
          </div>
          <div className="progress-card">
            <div className="progress-ring"><span>72<small>%</small></span></div>
            <div><span className="feature-number">YOUR MOMENTUM</span><strong>Look at you go.</strong><p>3 of 4 project milestones complete</p></div>
            <span className="milestone-stars" aria-hidden="true">✦ · ✦ · ✦ · ○</span>
          </div>
          <span className="community-skill skill-float-one">AI/ML</span><span className="community-skill skill-float-two">UI/UX</span>
        </div>
      </section>

      <footer className="site-footer">
        <a className="brand" href="#home" aria-label="VIBE home">
          <img className="brand-logo" src="/vibe-logo.png" alt="VIBE" />
        </a>
        <span>Make good things happen.</span>
        <div className={`connection ${error ? "connection-error" : ""}`}>
          <span className="status-dot" aria-hidden="true" />
          <div><strong>{error ? "API connection failed" : "Backend status"}</strong><p aria-live="polite">{error ?? health?.message ?? "Checking FastAPI connection..."}</p></div>
        </div>
        <span className="footer-copy">© 2026 VIBE · Made for people who make things.</span>
      </footer>

      {modal && (
        <div
          className="modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) setModal(null);
          }}
        >
          <Interactive3DCard
            className={`modal-panel ${modal === "events" ? "events-modal" : ""} ${modal === "teammates" ? "teammate-modal" : ""}`}
            role="dialog"
            ariaModal
            ariaLabelledBy="modal-title"
            accent="#b9f566"
          >
            <button className="modal-close icon-button" onClick={() => setModal(null)} aria-label="Close dialog">×</button>
            {modal === "teammates" ? (
              <>
                <div className="modal-illustration modal-team-art" aria-hidden="true"><span>✳</span><i>AI/ML</i><b>UI/UX</b><strong>+</strong></div>
                <div className="eyebrow">LET’S MAKE A GOOD TEAM</div>
                <h2 id="modal-title">Tell us what you’re making.</h2>
                <p className="modal-intro">We’ll help you find people who bring the missing pieces.</p>
                <form className="match-form" onSubmit={(event) => { event.preventDefault(); setFormMessage("Your project brief is ready. Sign in to start matching with teammates."); }}>
                  <label className="field-label">Project name<input required name="projectName" placeholder="e.g. A better way to learn" /></label>
                  <label className="field-label">Project type<select required name="projectType" defaultValue=""><option value="" disabled>Choose a project type</option><option>Hackathon project</option><option>Startup idea</option><option>Open-source project</option><option>Community initiative</option><option>Something else</option></select></label>
                  <fieldset className="skill-field"><legend>Skills you’re looking for</legend><div className="skill-options">{skills.map((skill) => <button key={skill} className={`skill-chip ${selectedSkills.includes(skill) ? "selected" : ""}`} type="button" aria-pressed={selectedSkills.includes(skill)} onClick={() => toggleSkill(skill)}>{skill}</button>)}</div></fieldset>
                  <div className="form-row">
                    <label className="field-label">Experience<select name="experience" defaultValue="Any experience"><option>Any experience</option><option>Just starting</option><option>Some experience</option><option>Experienced</option></select></label>
                    <label className="field-label">Team size<select name="teamSize" defaultValue="2–4 people"><option>2–4 people</option><option>Just one more</option><option>5–8 people</option><option>Open to any size</option></select></label>
                  </div>
                  <div className="form-row">
                    <label className="field-label">Location<input name="location" placeholder="City or remote" /></label>
                    <label className="field-label">Availability<select name="availability" defaultValue="A few hours a week"><option>A few hours a week</option><option>Weekends</option><option>Part time</option><option>Full time</option><option>Flexible</option></select></label>
                  </div>
                  <label className="field-label">A little more about the idea <span className="optional-label">OPTIONAL</span><textarea name="description" rows={3} placeholder="What are you hoping to build together?" /></label>
                  <button className="button button-lime button-large submit-match" type="submit">Find Matching Teammates <span aria-hidden="true">↗</span></button>
                  {formMessage && <p className="form-message" role="status">{formMessage}</p>}
                </form>
              </>
            ) : modal === "events" ? (
              <>
                <div className="events-modal-head">
                  <div className="modal-illustration modal-calendar-art" aria-hidden="true"><span>08</span><i>⌖</i><b>🏆</b></div>
                  <div><div className="eyebrow">YOUR NEXT GOOD STORY</div><h2 id="modal-title">Find your next event.</h2><p className="modal-intro">A room full of ideas is closer than you think.</p></div>
                </div>
                <label className="event-search-label"><span aria-hidden="true">⌕</span><input aria-label="Search events" value={eventSearch} onChange={(event) => setEventSearch(event.target.value)} placeholder="Search events, skills, or places" /></label>
                <div className="event-filters" aria-label="Filter events">{eventFilters.map((filter) => <button key={filter} className={`filter-chip ${eventFilter === filter ? "active" : ""}`} aria-pressed={eventFilter === filter} onClick={() => setEventFilter(filter)}>{filter}</button>)}</div>
                <p className="sample-label"><span>●</span> SAMPLE EVENTS · PREVIEW CONTENT</p>
                <div className="event-list">
                  {filteredEvents.map((event) => <Interactive3DCard key={event.name} className={`event-card event-${event.color}`} accent="#b9f566">
                    <div className="event-date"><strong>{event.date.split(" ")[1]}</strong><span>{event.date.split(" ")[0]}</span></div>
                    <div className="event-details"><h3>{event.name}</h3><p>{event.skill}</p><div className="recommend-meta"><span>⌖ {event.place}</span><span>{event.mode}</span></div></div>
                    <button className="event-join" onClick={() => setFormMessage("This is sample event content. Live registration will be available when event data is connected.")}>View <span aria-hidden="true">↗</span></button>
                  </Interactive3DCard>)}
                  {filteredEvents.length === 0 && <p className="empty-events">No sample events match that search. Try another keyword or filter.</p>}
                </div>
                {formMessage && <p className="form-message" role="status">{formMessage}</p>}
              </>
            ) : (
              <>
                <div className="modal-illustration modal-auth-art" aria-hidden="true"><span>✳</span><i>v.</i></div>
                <div className="eyebrow">GOOD TO HAVE YOU HERE</div>
                <h2 id="modal-title">{modal === "login" ? "Welcome back." : "Your people are here."}</h2>
                <p className="modal-intro">{modal === "login" ? "Pick up right where your ideas left off." : "Join a community of people making things happen."}</p>
                <form className="match-form auth-form" onSubmit={handleAuthSubmit}>
                  {modal === "signup" && <label className="field-label">Username<input required name="name" autoComplete="username" minLength={3} maxLength={50} placeholder="Choose a username" /></label>}
                  <label className="field-label">Email address<input required type="email" name="email" autoComplete="email" placeholder="you@example.com" /></label>
                  <label className="field-label">Password<input required type="password" name="password" autoComplete={modal === "login" ? "current-password" : "new-password"} placeholder="At least 8 characters" minLength={8} /></label>
                  <button className="button button-lime button-large submit-match" type="submit" disabled={authLoading}>{authLoading ? "Please wait…" : modal === "login" ? "Log in" : "Create your account"} <span aria-hidden="true">↗</span></button>
                  {authMessage && <p className={`form-message ${authError ? "form-message-error" : ""}`} role="status">{authMessage}</p>}
                </form>
                <p className="auth-switch">{modal === "login" ? "New around here?" : "Already have an account?"} <button onClick={() => openModal(modal === "login" ? "signup" : "login")}>{modal === "login" ? "Join VIBE" : "Log in"}</button></p>
              </>
            )}
          </Interactive3DCard>
        </div>
      )}
    </main>
  );
}
