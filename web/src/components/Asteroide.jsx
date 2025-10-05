import { motion } from "framer-motion";
import asteroideImg from "../assets/asteroide.png";

const Asteroide = () => (
  <div style={{ margin: "16px 0" }}>
    <motion.img
      src={asteroideImg}
      alt="asteroide"
      style={{
        width: "64px",
        height: "64px",
        display: "block",
        margin: "0 auto",
      }}
      animate={{ rotate: 360 }}
      transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
    />
  </div>
);

export default Asteroide;
