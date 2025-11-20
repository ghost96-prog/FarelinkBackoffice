// WelcomeScreen.jsx
import React, { useState, useEffect } from "react";
import "../css/WelcomeScreen.css";
// Import images
import bridgebus from "../assets/bridgebus.jpg";
import busBookingApp from "../assets/bus-booking-app.jpg";
import bg2 from "../assets/bg2.jpg";
import flogo from "../assets/flogo.png";
import { useNavigate } from "react-router-dom";

const WelcomeScreen = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [rotatedLogos, setRotatedLogos] = useState([]);
  const navigate = useNavigate();

  // Generate random positions and rotations for background logos
  useEffect(() => {
    const logos = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      rotation: Math.random() * 360 - 180, // -180 to 180 degrees
      size: 80 + Math.random() * 120, // 80px to 200px
      x: Math.random() * 100, // 0% to 100%
      y: Math.random() * 100, // 0% to 100%
      opacity: 0.08 + Math.random() * 0.12, // 0.08 to 0.2
      blur: Math.random() * 2 // 0px to 2px blur
    }));
    setRotatedLogos(logos);
  }, []);

  const cards = [
    {
      id: "card_1",
      title: "Smart Bus Ticketing",
      description: "Automate ticketing and reduce manual work for your team",
      image: bridgebus,
      color: ["#0d7ca8ff", "#054260ff"],
      icon: "🚌",
    },
    {
      id: "card_2",
      title: "Real-time Sales Tracking",
      description:
        "Increase sales with digital ticketing and real-time analytics",
      lottie: true,
      color: ["#0e0560ff", "#15b4d4ff"],
      icon: "📊",
    },
    {
      id: "card_3",
      title: "Grow Your Business",
      description: "Expand your customer base with modern ticketing solutions",
      image: busBookingApp,
      color: ["#5543bdff", "#0e0560ff"],
      icon: "💼",
    },
  ];

  const handleIndexChanged = (index) => {
    setCurrentIndex(index);
  };
  
  const handleNavigateToLogin = () => {
    navigate('/login');
  };
  
  const onNavigateToRegister = () => {
    navigate('/register');
  };

  const renderBackgroundLogos = () => (
    <div className="backgroundLogosContainer">
      {rotatedLogos.map(logo => (
        <img
          key={logo.id}
          src={flogo}
          className="backgroundLogo"
          style={{
            position: 'absolute',
            left: `${logo.x}%`,
            top: `${logo.y}%`,
            width: `${logo.size}px`,
            height: `${logo.size}px`,
            transform: `rotate(${logo.rotation}deg)`,
            opacity: logo.opacity,
            filter: `blur(${logo.blur}px)`,
            pointerEvents: 'none',
            zIndex: 0
          }}
          alt=""
        />
      ))}
    </div>
  );

  const renderCard = (card, index) => (
    <div key={card.id} className="slide">
      <div className="card">
        <div
          className="gradient"
          style={{
            background: `linear-gradient(135deg, ${card.color[0]}, ${card.color[1]})`,
          }}
        >
          <div className="iconContainer">
            <span className="icon">{card.icon}</span>
          </div>
          <div className="imageContainer">
            {card.image ? (
              <img src={card.image} className="cardImage" alt={card.title} />
            ) : card.lottie ? (
              <div className="lottiePlaceholder">
                <span className="lottieIcon">📱</span>
                <p>Real-time Analytics</p>
              </div>
            ) : null}
          </div>
          <div className="textContainer">
            <h2 className="title">{card.title}</h2>
            <p className="description">{card.description}</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderFinalScreen = () => (
    <div
      className="finalScreenContainer"
      style={{
        backgroundImage: `url(${bg2})`,
      }}
    >
      <div className="finalCard">
        <div className="finalContent">
          {/* Logo Section */}
          <div className="logoSection">
            <img className="logo" src={flogo} alt="FareLink Logo" />

            <h1 className="welcomeTitle">Welcome to FareLink</h1>

            <p className="welcomeSubtitle">Smart ticketing solutions</p>

            <div className="taglineContainer">
              <span className="sparkle">✨</span>
              <span className="taglineText">Smart • Secure • Simple</span>
              <span className="sparkle">✨</span>
            </div>
          </div>

          {/* Buttons Section */}
          <div className="buttonsSection">
            <div className="buttonWrapper">
              <button onClick={handleNavigateToLogin} className="loginButton">
                <span className="buttonIcon">🔐</span>
                <span className="btnText">SIGN IN</span>
                <span className="chevron">→</span>
              </button>
            </div>

            <div className="buttonWrapper">
              <button onClick={onNavigateToRegister} className="registerButton">
                <span className="buttonIcon">👤</span>
                <span className="regBtnText">CREATE ACCOUNT</span>
                <span className="chevron">→</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Show final screen directly if we're on the last card
  if (currentIndex === cards.length) {
    return renderFinalScreen();
  }

  return (
    <div className="container">
      <div className="fullScreenContainer">
        {/* Background Logos for Carousel Screen */}
        {renderBackgroundLogos()}
        
        <div className="controlsContainer">
          <button
            className="skipButton"
            onClick={() => setCurrentIndex(cards.length)}
          >
            Skip
          </button>
        </div>

        <div className="swiperContainer">
          <div
            className="cardsWrapper"
            style={{
              transform: `translateX(-${currentIndex * 100}%)`,
            }}
          >
            {cards.map(renderCard)}
          </div>
        </div>

        {/* Dots Indicator */}
        <div className="pagination">
          {cards.map((_, index) => (
            <div
              key={index}
              className={`dot ${index === currentIndex ? "activeDot" : ""}`}
              onClick={() => setCurrentIndex(index)}
            />
          ))}
        </div>

        <div className="bottomContainer">
          <button
            className="nextButton"
            onClick={() => {
              if (currentIndex === cards.length - 1) {
                setCurrentIndex(cards.length);
              } else {
                setCurrentIndex(currentIndex + 1);
              }
            }}
          >
            <div
              className="nextButtonContent"
              style={{
                background:
                  currentIndex === cards.length - 1
                    ? "linear-gradient(135deg, #5543bdff, #0e0560ff)"
                    : "linear-gradient(135deg, #0b74a8ff, #054260ff)",
              }}
            >
              <span className="nextButtonText">
                {currentIndex === cards.length - 1 ? "Get Started 🚀" : "Next"}
              </span>
              <span className="nextIcon">
                {currentIndex === cards.length - 1 ? "🚀" : "→"}
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;