import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaBrain, FaCrosshairs, FaPalette, FaMicrophoneAlt, FaFilm, FaTrophy, FaFacebook, FaGlobe, FaCheckCircle, FaStar, FaPlayCircle, FaVolumeUp, FaVolumeMute } from 'react-icons/fa';
import EpicButton from '../components/EpicButton';
import VideoPlayer from '../components/VideoPlayer';

export default function LandingPage() {
  const [siteEntered, setSiteEntered] = useState(false);
  const [loadVideo, setLoadVideo] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef(null);
  const videoContainerRef = useRef(null);
  
  const features = [
    { title: 'Recomendador IA', desc: 'Recibe recomendaciones de campeón, rol y estilo de juego basadas en tu personalidad y signo zodiacal, con 3 tips clave para empezar a ganar.', icon: <FaBrain /> },
    { title: 'Análisis de Partida 360°', desc: 'Domina cada partida con builds y runas adaptativas, análisis pre-juego, consejos en vivo y reportes post-partida para explotar tus fortalezas.', icon: <FaCrosshairs /> },
    { title: 'Overlays Inteligentes', desc: 'Transforma tu stream con overlays que te narran consejos y planes de juego en tiempo real para que no quites la vista de la acción.', icon: <FaPalette /> },
    { title: 'TTS Narrativo', desc: 'Inmortaliza tus jugadas. Nuestra IA genera una narración épica y sincronizada para tus clips virales, convirtiendo cada highlight en una leyenda.', fun: '', icon: <FaMicrophoneAlt /> },
    { title: 'Clips Automáticos', desc: 'La IA detecta tus jugadas clave y genera clips virales listos para TikTok y YouTube, con tu branding y la narración épica incluidas.', icon: <FaFilm /> },
    { title: 'Gamificación y Rankings', desc: 'Demuestra la supremacía de tu signo. Compite en rankings semanales basados en data oficial de Riot y gana medallas exclusivas.', icon: <FaTrophy /> }
  ];

  const handleSiteEnter = () => {
    const audio = new Audio('/welcome.mp3');
    audio.play();
    setSiteEntered(true);
    setLoadVideo(true);
    setIsMuted(false);
  };
  
  const onPlayerReady = (event) => {
    videoRef.current = event.target;
  };
  
  const toggleMute = () => {
    if (videoRef.current) {
        if (isMuted) {
            videoRef.current.unMute();
        } else {
            videoRef.current.mute();
        }
        setIsMuted(!isMuted);
    }
  };
  
  useEffect(() => {
    const player = videoRef.current;
    if (player && siteEntered) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            player.playVideo();
          } else {
            player.pauseVideo();
          }
        },
        { threshold: 0.5 }
      );
      observer.observe(videoContainerRef.current);
      return () => {
        observer.disconnect();
      };
    }
  }, [siteEntered, loadVideo]);

  if (!siteEntered) {
    return (
      <div className="h-screen w-screen bg-lol-blue-dark flex flex-col justify-center items-center text-center p-4 bg-[url('/img/background.webp')] bg-cover bg-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1 }}
        >
          <h1 className="text-6xl md:text-8xl font-display font-extrabold text-lol-gold-light text-shadow-lg">
            LoL MetaMind
          </h1>
          <p className="mt-4 text-lg md:text-2xl max-w-3xl text-lol-gold-light/90 text-shadow-md">
            Tu ventaja estratégica ha llegado.
          </p>
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="mt-12"
          >
             <EpicButton onClick={handleSiteEnter}>INGRESAR</EpicButton>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="min-h-screen bg-lol-blue-dark text-lol-gold-light font-body overflow-x-hidden bg-[url('/img/background.webp')] bg-cover bg-center bg-fixed"
      >
        <section
          className="relative h-screen flex flex-col justify-center items-center text-center px-4 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "linear-gradient(rgba(1, 10, 19, 0.7), rgba(1, 10, 19, 0.9)), url('/img/hero-bg.webp')" }}
        >
          <motion.h1
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            className="text-6xl md:text-8xl font-display font-extrabold text-lol-gold-light text-shadow-lg"
          >
            LoL MetaMind
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 1 }}
            className="mt-4 text-lg md:text-2xl max-w-3xl text-lol-gold-light/90 text-shadow-md"
          >
            La unica plataforma que fusiona la Astrologia + IA + Analiticas Riot, para darte coaching en tiempo real, clips virales y una ventaja estratégica.
            Bienvenido al futuro del coaching. Una experiencia inmersiva que se adapta a tu estilo.
          </motion.p>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1.8, type: 'spring', stiffness: 100 }}
            className="mt-10"
          >
            <a href="https://couchmetamind.vercel.app/" target="_blank" rel="noopener noreferrer">
                <EpicButton>Explorar Plataforma</EpicButton>
            </a>
          </motion.div>
        </section>

        <section className="py-20 px-4 bg-lol-blue-dark/80 backdrop-blur-sm">
          <motion.h2
            initial={{ x: -100, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="text-4xl md:text-6xl font-display font-bold text-center mb-12 text-lol-gold text-shadow-md"
          >
            Una Nueva Era en el Juego
          </motion.h2>
          <div className="flex justify-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2 }}
              className="w-full max-w-[750px] shadow-2xl border-4 border-lol-gold-dark rounded-3xl overflow-hidden flex justify-center"
              style={{ boxShadow: '0 0 25px rgba(200, 155, 60, 0.4)' }}
              ref={videoContainerRef}
            >
                <div className="relative w-full">
                    <VideoPlayer
                        videoId="jss22SRCvms"
                        onReady={onPlayerReady}
                        isMuted={isMuted}
                    />
                    <button
                        onClick={toggleMute}
                        className="absolute bottom-4 right-4 p-2 bg-lol-blue-medium/70 rounded-full text-lol-gold-light hover:bg-lol-blue-medium transition-colors"
                    >
                        {isMuted ? <FaVolumeMute size={24} /> : <FaVolumeUp size={24} />}
                    </button>
                </div>
            </motion.div>
          </div>
        </section>

        <section className="py-20 px-4 bg-lol-blue-dark">
            <motion.h2 initial={{ y: 50, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ duration: 1 }} className="text-4xl md:text-6xl font-display font-bold text-center text-lol-gold mb-16 text-shadow-md">
                Funcionalidades Épicas
            </motion.h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {features.map((feature, idx) => (
                <motion.div key={idx} initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: idx * 0.1 }} className="bg-lol-blue-medium p-6 border-2 border-lol-gold-dark hover:border-lol-blue-accent transition-colors duration-300 flex flex-col items-center text-center">
                <div className="text-4xl text-lol-blue-accent mb-4">{feature.icon}</div>
                <h3 className="text-2xl font-display font-bold mb-3 text-lol-gold">{feature.title}</h3>
                <p className="text-lol-gold-light/80 text-lg leading-relaxed">{feature.desc}</p>
                </motion.div>
            ))}
            </div>
        </section>

        <section className="py-20 px-4 bg-lol-blue-dark">
            <motion.h2 initial={{ y: 50, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ duration: 1 }} className="text-4xl md:text-6xl font-display font-bold text-center text-lol-gold mb-16 text-shadow-md">
                Elegí Tu Arsenal
            </motion.h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            <motion.div initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 1 }} className="bg-lol-blue-medium p-8 border-2 border-lol-gold-dark flex flex-col">
                <h3 className="text-3xl font-display font-bold text-lol-gold-light mb-4">Plan Gratuito</h3>
                <p className="text-lol-gold-light/70 mb-8">Perfecto para empezar a explorar tu potencial astrológico.</p>
                <ul className="space-y-4 text-lg">
                <li className="flex items-center gap-3"><FaCheckCircle className="text-lol-blue-accent" /> Recomendador de Campeón</li>
                <li className="flex items-center gap-3"><FaCheckCircle className="text-lol-blue-accent" /> Análisis Pre-Partida Básico</li>
                <li className="flex items-center gap-3"><FaCheckCircle className="text-lol-blue-accent" /> Perfil Zodiacal Básico</li>
                <li className="flex items-center gap-3"><FaCheckCircle className="text-lol-blue-accent" /> Clips con marca de agua</li>
                <li className="flex items-center gap-3"><FaCheckCircle className="text-lol-blue-accent" /> TTS para clips (Voz estándar)</li>
                </ul>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 1, delay: 0.2 }} className="bg-lol-blue-medium p-8 border-2 border-lol-blue-accent relative flex flex-col" style={{ boxShadow: '0 0 25px rgba(11, 198, 227, 0.5)' }}>
                <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2 bg-lol-blue-accent text-lol-blue-dark font-bold font-display px-4 py-1 text-sm uppercase tracking-widest">
                <FaStar className="inline-block mr-2" />
                Más Popular
                </div>
                <h3 className="text-3xl font-display font-bold text-lol-blue-accent mb-4">Plan Premium</h3>
                <p className="text-lol-gold-light/70 mb-8">Desata todo el poder de MetaMind y domina la grieta.</p>
                <ul className="space-y-4 text-lg">
                    <li className="flex items-start gap-3"><FaCheckCircle className="text-lol-blue-accent mt-1 flex-shrink-0" /> <div><strong className="text-lol-gold-light">Todo lo del Plan Gratuito,</strong> y además:</div></li>
                    <li className="flex items-center gap-3"><FaCheckCircle className="text-lol-blue-accent" /> <strong className="text-lol-gold-light">Builds y Runas Adaptativas</strong></li>
                    <li className="flex items-center gap-3"><FaCheckCircle className="text-lol-blue-accent" /> <strong className="text-lol-gold-light">Consejos Estratégicos en Vivo</strong></li>
                    <li className="flex items-center gap-3"><FaCheckCircle className="text-lol-light" /> <strong className="text-lol-gold-light">Análisis Post-Partida Detallado</strong></li>
                    <li className="flex items-center gap-3"><FaCheckCircle className="text-lol-blue-accent" /> <strong className="text-lol-gold-light">Overlays Inteligentes Animados</strong></li>
                    <li className="flex items-center gap-3"><FaCheckCircle className="text-lol-blue-accent" /> <strong className="text-lol-gold-light">Clips Ilimitados sin marca</strong></li>
                    <li className="flex items-center gap-3"><FaCheckCircle className="text-lol-blue-accent" /> <strong className="text-lol-gold-light">TTS Pro en Overlay y Clips</strong></li>
                </ul>
            </motion.div>
            </div>
        </section>

        <section className="py-20 px-4 bg-lol-blue-dark/80 text-center bg-cover bg-center" style={{ backgroundImage: "linear-gradient(rgba(10, 20, 40, 0.8), rgba(10, 20, 40, 0.9)), url('/img/background.webp')"}}>
            <motion.h2 initial={{ scale: 0.8, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true }} transition={{ duration: 1 }} className="text-5xl md:text-7xl font-display font-bold mb-6 text-lol-gold-light text-shadow-lg">
                Elevá tu Juego Hoy
            </motion.h2>
            <motion.p initial={{ y: 50, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ duration: 1, delay: 0.2 }} className="text-lol-gold-light/90 text-lg md:text-2xl mb-10 max-w-3xl mx-auto text-shadow-md">
                Dejá de adivinar. Empezá a dominar. Uníte a la revolución de estrategia y contenido con el poder de la IA y la astrología.
            </motion.p>
            <a href="https://couchmetamind.vercel.app/" target="_blank" rel="noopener noreferrer">
                <EpicButton>Registrate Gratis</EpicButton>
            </a>
        </section>

        <footer className="py-8 bg-lol-blue-dark text-center text-lol-gold-light/70 border-t border-lol-gold-dark">
            <div className="flex justify-center items-center gap-6 mb-4">
                <a href="https://www.facebook.com/SolucionesSOIN" target="_blank" rel="noopener noreferrer" className="hover:text-lol-blue-accent transition-colors">
                    <FaFacebook size={28} />
                </a>
                <a href="https://websoin.netlify.app/" target="_blank" rel="noopener noreferrer" className="hover:text-lol-blue-accent transition-colors">
                    <FaGlobe size={28} />
                </a>
            </div>
            <p>Un proyecto de <strong>SO-&gt;IN Soluciones Informáticas</strong></p>
            <p>&copy; {new Date().getFullYear()} Todos los derechos reservados.</p>
        </footer>
      </motion.div>
    </AnimatePresence>
  );
}