import ServiceItem from "./ServiceItem";
import { Phone, MessageCircle, Send } from "lucide-react";

// Import background images
import verificationModel from "@/assets/verification-model.png";
import flightTicket from "@/assets/flight-ticket.png";
import usaFlag from "@/assets/usa-flag.png";
import ukFlag from "@/assets/uk-flag.png";
import canadaFlag from "@/assets/canada-flag.png";
import tiktokIcon from "@/assets/tiktok-icon.png";
import whatsappIcon from "@/assets/whatsapp-icon.png";
import instagramIcon from "@/assets/instagram-icon.png";
import facebookIcon from "@/assets/facebook-icon.png";
import telegramIcon from "@/assets/telegram-icon.png";
import callIcon from "@/assets/call-icon.png";
import twitterIcon from "@/assets/twitter-icon.png";
import snapchatIcon from "@/assets/snapchat-icon.png";

const services = [
  "Paper Holding",
  "Military ID Card",
  "Video Lips Sync",
  "Frame Holding",
  "Flash Mail",
  "News Broadcast",
  "Hospital Bill Invoice",
  "Hotel Bookings",
  "Picture to Video",
  "Tracking Link",
  "All Cities Driver License",
  "Picture Undressing",
  "Inside Jail Editing",
  "All Selfie Verifications",
  "Flight Ticket Editing",
  "Trackable Flight Booking",
  "Num Verification (Any App)",
  "Social Media Boosting",
  "Video Calling (Per Min)",
  "Photo Editing",
  "Facebook Available",
  "TikTok Available",
];

const Flyer = () => {
  return (
    <div className="w-full h-screen max-w-md mx-auto bg-gradient-bg relative overflow-hidden flex flex-col">
      {/* Scattered Background Images - More Visible */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Verification Model - top left */}
        <img 
          src={verificationModel} 
          alt="" 
          className="absolute -top-2 -left-4 w-20 h-20 object-cover rounded-full opacity-50 rotate-[-15deg] border-2 border-neon-pink/50 shadow-lg"
        />
        
        {/* TikTok - top area */}
        <img 
          src={tiktokIcon} 
          alt="" 
          className="absolute top-2 left-[30%] w-12 h-12 object-contain opacity-60 rotate-[10deg]"
        />
        
        {/* Flight Ticket - top right */}
        <img 
          src={flightTicket} 
          alt="" 
          className="absolute top-4 -right-4 w-20 h-16 object-cover opacity-50 rotate-[15deg]"
        />
        
        {/* Instagram - left side */}
        <img 
          src={instagramIcon} 
          alt="" 
          className="absolute top-[15%] left-0 w-10 h-10 object-contain opacity-55 rotate-[-8deg]"
        />
        
        {/* Facebook - right side */}
        <img 
          src={facebookIcon} 
          alt="" 
          className="absolute top-[18%] right-2 w-11 h-11 object-contain opacity-55 rotate-[12deg]"
        />
        
        {/* USA Flag */}
        <img 
          src={usaFlag} 
          alt="" 
          className="absolute top-[28%] -left-2 w-14 h-10 object-cover opacity-55 rotate-[-5deg]"
        />
        
        {/* UK Flag */}
        <img 
          src={ukFlag} 
          alt="" 
          className="absolute top-[25%] -right-1 w-12 h-9 object-cover opacity-55 rotate-[8deg]"
        />
        
        {/* WhatsApp - middle left */}
        <img 
          src={whatsappIcon} 
          alt="" 
          className="absolute top-[38%] -left-1 w-11 h-11 object-contain opacity-55 rotate-[5deg]"
        />
        
        {/* Telegram - middle right */}
        <img 
          src={telegramIcon} 
          alt="" 
          className="absolute top-[35%] right-0 w-10 h-10 object-contain opacity-50 rotate-[-10deg]"
        />
        
        {/* Canada Flag */}
        <img 
          src={canadaFlag} 
          alt="" 
          className="absolute top-[48%] -left-2 w-12 h-10 object-cover opacity-50 rotate-[10deg]"
        />
        
        {/* Twitter/X */}
        <img 
          src={twitterIcon} 
          alt="" 
          className="absolute top-[45%] right-1 w-10 h-10 object-contain opacity-50 rotate-[15deg]"
        />
        
        {/* Call Icon */}
        <img 
          src={callIcon} 
          alt="" 
          className="absolute top-[55%] left-1 w-10 h-10 object-contain opacity-55 rotate-[-12deg]"
        />
        
        {/* Snapchat */}
        <img 
          src={snapchatIcon} 
          alt="" 
          className="absolute top-[52%] -right-1 w-11 h-11 object-contain opacity-50 rotate-[8deg]"
        />
        
        {/* Verification Model 2 - bottom area */}
        <img 
          src={verificationModel} 
          alt="" 
          className="absolute bottom-[22%] -right-4 w-18 h-18 object-cover rounded-full opacity-45 rotate-[12deg] border-2 border-neon-blue/50"
        />
        
        {/* Flight ticket - bottom left */}
        <img 
          src={flightTicket} 
          alt="" 
          className="absolute bottom-[25%] -left-4 w-16 h-14 object-cover opacity-45 rotate-[-18deg]"
        />
        
        {/* TikTok - bottom */}
        <img 
          src={tiktokIcon} 
          alt="" 
          className="absolute bottom-[15%] left-2 w-9 h-9 object-contain opacity-50 rotate-[-5deg]"
        />
        
        {/* Instagram - bottom right */}
        <img 
          src={instagramIcon} 
          alt="" 
          className="absolute bottom-[18%] right-4 w-9 h-9 object-contain opacity-45 rotate-[20deg]"
        />
        
        {/* USA Flag - bottom */}
        <img 
          src={usaFlag} 
          alt="" 
          className="absolute bottom-8 right-2 w-10 h-8 object-cover opacity-45 rotate-[10deg]"
        />
        
        {/* UK Flag - bottom */}
        <img 
          src={ukFlag} 
          alt="" 
          className="absolute bottom-6 left-4 w-10 h-7 object-cover opacity-45 rotate-[-8deg]"
        />

        {/* Country Code Badges - More Visible */}
        <div className="absolute top-[32%] right-14 bg-neon-blue/60 px-2 py-1 rounded-md text-xs font-bold text-foreground opacity-70 rotate-[5deg] shadow-md">
          +1
        </div>
        <div className="absolute top-[42%] left-12 bg-neon-pink/60 px-2 py-1 rounded-md text-xs font-bold text-foreground opacity-70 rotate-[-8deg] shadow-md">
          +44
        </div>
        <div className="absolute bottom-[30%] right-8 bg-neon-orange/60 px-2 py-1 rounded-md text-xs font-bold text-foreground opacity-65 rotate-[12deg] shadow-md">
          +1
        </div>
        <div className="absolute top-[58%] right-12 bg-neon-green/60 px-2 py-1 rounded-md text-xs font-bold text-foreground opacity-65 rotate-[-5deg] shadow-md">
          +44
        </div>
      </div>

      {/* Decorative blur elements */}
      <div className="absolute top-0 left-0 w-40 h-40 bg-neon-pink/15 rounded-full blur-3xl" />
      <div className="absolute top-20 right-0 w-32 h-32 bg-neon-blue/15 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-10 w-36 h-36 bg-neon-orange/10 rounded-full blur-3xl" />
      
      {/* Header */}
      <div className="relative z-10 pt-5 pb-3 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-black uppercase tracking-wider bg-gradient-to-r from-neon-pink via-neon-orange to-neon-blue bg-clip-text text-transparent drop-shadow-lg">
            Premium Services
          </h1>
          <div className="mt-1 h-1 w-28 mx-auto bg-gradient-to-r from-neon-pink to-neon-blue rounded-full" />
        </div>
      </div>

      {/* Services Section */}
      <div className="relative z-10 flex-1 px-3 py-1">
        <div className="bg-card/95 backdrop-blur-md rounded-2xl p-3 border border-neon-pink/40 shadow-xl shadow-neon-pink/20">
          <div className="text-center mb-2">
            <span className="inline-block px-4 py-1 bg-gradient-to-r from-neon-pink to-neon-orange rounded-full text-[10px] font-bold uppercase tracking-widest text-foreground shadow-lg">
              Our Services
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
            {services.map((service, index) => (
              <ServiceItem key={index} text={service} />
            ))}
          </div>
        </div>
      </div>

      {/* Contact Section */}
      <div className="relative z-10 px-4 pb-4 pt-1">
        <div className="bg-gradient-to-r from-neon-pink/25 via-neon-blue/25 to-neon-orange/25 rounded-2xl p-3 border border-neon-blue/40 backdrop-blur-sm">
          <p className="text-center text-[10px] font-bold uppercase tracking-widest text-neon-blue mb-2">
            Contact Us Now
          </p>
          <div className="flex justify-center gap-6">
            <div className="flex flex-col items-center gap-1">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-neon-green to-neon-blue flex items-center justify-center shadow-lg shadow-neon-green/40">
                <Phone className="w-4 h-4 text-foreground" />
              </div>
              <span className="text-[8px] text-muted-foreground uppercase">Call</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-neon-green to-neon-blue flex items-center justify-center shadow-lg shadow-neon-green/40">
                <MessageCircle className="w-4 h-4 text-foreground" />
              </div>
              <span className="text-[8px] text-muted-foreground uppercase">WhatsApp</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-neon-blue to-neon-pink flex items-center justify-center shadow-lg shadow-neon-blue/40">
                <Send className="w-4 h-4 text-foreground" />
              </div>
              <span className="text-[8px] text-muted-foreground uppercase">Telegram</span>
            </div>
          </div>
        </div>
        
        {/* Footer branding */}
        <p className="text-center mt-2 text-[9px] text-muted-foreground uppercase tracking-widest">
          Fast • Reliable • Discrete
        </p>
      </div>
    </div>
  );
};

export default Flyer;
