import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBath,
  faBullseye,
  faCalendarCheck,
  faCat,
  faClover,
  faFilter,
  faFutbol,
  faGhost,
  faHatWizard,
  faRotateLeft,
  faShieldHalved,
  faSnowflake,
  faSquare,
  faStar,
  faThumbsDown,
  faTrophy,
  faWineBottle,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import type { IconName } from "@/lib/types";

const ICONS = {
  ball: faFutbol,
  target: faBullseye,
  calendar: faCalendarCheck,
  star: faStar,
  wall: faShieldHalved,
  hat: faHatWizard,
  clover: faClover,
  ice: faSnowflake,
  card: faSquare,
  bath: faBath,
  "wrong-way": faRotateLeft,
  bottle: faWineBottle,
  cat: faCat,
  ghost: faGhost,
  sieve: faFilter,
  trophy: faTrophy,
  "thumbs-down": faThumbsDown,
  miss: faXmark,
} satisfies Record<IconName, unknown>;

export function Icon({ name, className }: { name: IconName; className?: string }) {
  return <FontAwesomeIcon icon={ICONS[name]} className={className} aria-hidden="true" fixedWidth />;
}
