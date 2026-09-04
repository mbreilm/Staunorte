// =====================================================================
// types.ts  ·  Einzige Quelle der Wahrheit für Datentypen im Projekt.
//
// Von Hand aus supabase/migrations/0001-0004 abgeleitet (kein Live-Codegen,
// da lokal keine Supabase-CLI verfügbar ist). Bei jeder neuen Migration
// muss diese Datei manuell mitgezogen werden.
//
// Form folgt der Konvention, die `supabase gen types typescript` erzeugt,
// damit `createClient<Database>()` typsicher bleibt und ein späterer
// Wechsel auf echten Codegen ohne Anpassungen an Aufrufstellen möglich ist.
// =====================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// --- Enums / kontrollierte Wertebereiche, aus den CHECK-Constraints -----

export type PlaceCategoryLifecycle = "endlich" | "dauerhaft";
export type PlaceStatus = "aktiv" | "ruhend" | "vermutlich_beendet" | "beendet";
export type PlaceSource = "user" | "open_data";
export type PlaceHoursPreset = "werktags" | "werktags_sa" | "durchgehend" | "custom";
export type ObservableClass =
  | "permanent"
  | "standgeraet"
  | "stationaer_mobil"
  | "mobil"
  | "transient";
export type ObservableRarity = "haeufig" | "selten" | "legendaer";
export type PhotoModerationStatus = "ok" | "gemeldet" | "entfernt";
export type ReportTargetType = "place" | "photo";
export type ReportReason =
  | "existiert_nicht"
  | "falscher_ort"
  | "unpassendes_foto"
  | "personen_erkennbar"
  | "sonstiges";

// "jetzt vermutlich aktiv?" - siehe place_is_active_now() in 0002_functions.sql
export type ActivityState = "aktiv" | "ruhe" | "unbekannt";
// Konfidenz-Stufe aus confidence_bucket() in 0002_functions.sql
export type ConfidenceBucket = "jetzt_hier" | "kuerzlich" | "archiv";

export type Database = {
  public: {
    Tables: {
      place_categories: {
        Row: {
          id: string;
          name_singular: string;
          name_plural: string;
          observable_label: string;
          hours_label: string;
          lifecycle: PlaceCategoryLifecycle;
          safety_notice: string;
          attribute_schema: Json;
          marker_style: Json;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          name_singular: string;
          name_plural: string;
          observable_label: string;
          hours_label: string;
          lifecycle?: PlaceCategoryLifecycle;
          safety_notice?: string;
          attribute_schema?: Json;
          marker_style?: Json;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["place_categories"]["Insert"]
        >;
        Relationships: [];
      };

      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          is_admin: boolean;
          is_blocked: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          is_admin?: boolean;
          is_blocked?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        // id -> auth.users.id: auth-Schema wird hier nicht modelliert.
        Relationships: [];
      };

      places: {
        Row: {
          id: string;
          category_id: string;
          title: string;
          /** geography(Point,4326) - als EWKB/WKT-String, nicht direkt in JS nutzbar.
           *  Lat/Lon kommen stattdessen über places_nearby() oder eine View. */
          geom: unknown;
          address: string | null;
          attributes: Json;
          status: PlaceStatus;
          source: PlaceSource;
          is_confirmed: boolean;
          external_id: string | null;
          external_end_at: string | null;
          note: string | null;
          created_by: string | null;
          created_at: string;
          last_activity_at: string;
          checkin_count: number;
          is_hidden: boolean;
          hidden_reason: string | null;
        };
        Insert: {
          id?: string;
          category_id: string;
          title: string;
          geom: unknown;
          address?: string | null;
          attributes?: Json;
          status?: PlaceStatus;
          source?: PlaceSource;
          is_confirmed?: boolean;
          external_id?: string | null;
          external_end_at?: string | null;
          note?: string | null;
          created_by?: string | null;
          created_at?: string;
          last_activity_at?: string;
          checkin_count?: number;
          is_hidden?: boolean;
          hidden_reason?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["places"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "places_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "place_categories";
            referencedColumns: ["id"];
          },
        ];
      };

      place_hours: {
        Row: {
          id: string;
          place_id: string;
          preset: PlaceHoursPreset;
          weekday: number; // 0-6, 0 = Montag
          start_min: number; // 0-1440
          end_min: number; // 0-1440
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          place_id: string;
          preset: PlaceHoursPreset;
          weekday: number;
          start_min: number;
          end_min: number;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["place_hours"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "place_hours_place_id_fkey";
            columns: ["place_id"];
            isOneToOne: false;
            referencedRelation: "places";
            referencedColumns: ["id"];
          },
        ];
      };

      place_activity: {
        Row: {
          place_id: string;
          weekday: number; // 0-6
          hour: number; // 0-23
          active_count: number;
          quiet_count: number;
        };
        Insert: {
          place_id: string;
          weekday: number;
          hour: number;
          active_count?: number;
          quiet_count?: number;
        };
        Update: Partial<
          Database["public"]["Tables"]["place_activity"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "place_activity_place_id_fkey";
            columns: ["place_id"];
            isOneToOne: false;
            referencedRelation: "places";
            referencedColumns: ["id"];
          },
        ];
      };

      observable_types: {
        Row: {
          id: string;
          category_id: string;
          name_de: string;
          kid_name: string | null;
          group_name: string | null;
          class: ObservableClass;
          half_life_days: number | null; // NULL nur bei class = 'permanent'
          is_permanent: boolean;
          rarity: ObservableRarity;
          sort_order: number;
          icon: string | null; // Emoji
          kid_description: string | null;
          is_active: boolean;
        };
        Insert: {
          id: string;
          category_id: string;
          name_de: string;
          kid_name?: string | null;
          group_name?: string | null;
          class: ObservableClass;
          half_life_days?: number | null;
          is_permanent?: boolean;
          rarity?: ObservableRarity;
          sort_order?: number;
          icon?: string | null;
          kid_description?: string | null;
          is_active?: boolean;
        };
        Update: Partial<
          Database["public"]["Tables"]["observable_types"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "observable_types_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "place_categories";
            referencedColumns: ["id"];
          },
        ];
      };

      place_observables: {
        Row: {
          place_id: string;
          observable_type_id: string;
          first_seen_at: string;
          last_seen_at: string;
          positive_count: number;
          negative_count: number;
          distinct_reporters: number;
        };
        Insert: {
          place_id: string;
          observable_type_id: string;
          first_seen_at?: string;
          last_seen_at?: string;
          positive_count?: number;
          negative_count?: number;
          distinct_reporters?: number;
        };
        Update: Partial<
          Database["public"]["Tables"]["place_observables"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "place_observables_place_id_fkey";
            columns: ["place_id"];
            isOneToOne: false;
            referencedRelation: "places";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "place_observables_observable_type_id_fkey";
            columns: ["observable_type_id"];
            isOneToOne: false;
            referencedRelation: "observable_types";
            referencedColumns: ["id"];
          },
        ];
      };

      checkins: {
        Row: {
          id: string;
          place_id: string;
          user_id: string;
          created_at: string;
          lat: number | null;
          lon: number | null;
          accuracy_m: number | null;
          distance_m: number | null;
          local_weekday: number | null;
          local_hour: number | null;
          counts_toward_stats: boolean;
        };
        Insert: {
          id?: string;
          place_id: string;
          user_id: string;
          created_at?: string;
          lat?: number | null;
          lon?: number | null;
          accuracy_m?: number | null;
          distance_m?: number | null;
          local_weekday?: number | null;
          local_hour?: number | null;
          counts_toward_stats?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["checkins"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "checkins_place_id_fkey";
            columns: ["place_id"];
            isOneToOne: false;
            referencedRelation: "places";
            referencedColumns: ["id"];
          },
        ];
      };

      checkin_observables: {
        Row: {
          checkin_id: string;
          observable_type_id: string;
        };
        Insert: {
          checkin_id: string;
          observable_type_id: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["checkin_observables"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "checkin_observables_checkin_id_fkey";
            columns: ["checkin_id"];
            isOneToOne: false;
            referencedRelation: "checkins";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "checkin_observables_observable_type_id_fkey";
            columns: ["observable_type_id"];
            isOneToOne: false;
            referencedRelation: "observable_types";
            referencedColumns: ["id"];
          },
        ];
      };

      user_observable_unlocks: {
        Row: {
          user_id: string;
          observable_type_id: string;
          first_place_id: string | null;
          unlocked_at: string;
        };
        Insert: {
          user_id: string;
          observable_type_id: string;
          first_place_id?: string | null;
          unlocked_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["user_observable_unlocks"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "user_observable_unlocks_observable_type_id_fkey";
            columns: ["observable_type_id"];
            isOneToOne: false;
            referencedRelation: "observable_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_observable_unlocks_first_place_id_fkey";
            columns: ["first_place_id"];
            isOneToOne: false;
            referencedRelation: "places";
            referencedColumns: ["id"];
          },
        ];
      };

      place_photos: {
        Row: {
          id: string;
          place_id: string;
          storage_path: string;
          uploaded_by: string | null;
          created_at: string;
          taken_at: string | null;
          exif_lat: number | null;
          exif_lon: number | null;
          moderation_status: PhotoModerationStatus;
        };
        Insert: {
          id?: string;
          place_id: string;
          storage_path: string;
          uploaded_by?: string | null;
          created_at?: string;
          taken_at?: string | null;
          exif_lat?: number | null;
          exif_lon?: number | null;
          moderation_status?: PhotoModerationStatus;
        };
        Update: Partial<
          Database["public"]["Tables"]["place_photos"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "place_photos_place_id_fkey";
            columns: ["place_id"];
            isOneToOne: false;
            referencedRelation: "places";
            referencedColumns: ["id"];
          },
        ];
      };

      reports: {
        Row: {
          id: string;
          target_type: ReportTargetType;
          target_id: string;
          reporter_id: string | null;
          reason: ReportReason;
          comment: string | null;
          created_at: string;
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          target_type: ReportTargetType;
          target_id: string;
          reporter_id?: string | null;
          reason: ReportReason;
          comment?: string | null;
          created_at?: string;
          resolved_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["reports"]["Insert"]>;
        // target_id ist polymorph (place|photo) - keine echte FK-Constraint.
        Relationships: [];
      };

      holidays: {
        Row: {
          day: string; // date, ISO "YYYY-MM-DD"
          name: string;
        };
        Insert: {
          day: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["holidays"]["Insert"]>;
        Relationships: [];
      };
    };

    Views: {
      // v_place_observables aus 0002_functions.sql. Liefert Confidence bereits
      // berechnet mit - negative_count wird bewusst NICHT ausgeliefert.
      v_place_observables: {
        Row: {
          place_id: string;
          observable_type_id: string;
          name_de: string;
          kid_name: string | null;
          group_name: string | null;
          class: ObservableClass;
          rarity: ObservableRarity;
          icon: string | null;
          is_permanent: boolean;
          first_seen_at: string;
          last_seen_at: string;
          positive_count: number;
          distinct_reporters: number;
          confidence: number;
          bucket: ConfidenceBucket;
        };
        Relationships: [];
      };
    };

    Functions: {
      observable_confidence: {
        Args: {
          p_last_seen: string | null;
          p_half_life_days: number | null;
          p_is_permanent: boolean;
          p_negative_count: number;
          p_distinct_reporters: number;
        };
        Returns: number;
      };

      confidence_bucket: {
        Args: { p_confidence: number };
        Returns: ConfidenceBucket;
      };

      is_holiday_de_by: {
        Args: { p_day: string };
        Returns: boolean;
      };

      // "lohnt sich der Weg jetzt?" - Beobachtung schlägt Angabe, Feiertag
      // überschreibt alles. Siehe CLAUDE.md: Aktivität immer im Konjunktiv.
      place_is_active_now: {
        Args: { p_place_id: string; p_at?: string };
        Returns: ActivityState;
      };

      // Aggregierter Check-in-Zähler seit Wochenbeginn (Europe/Berlin,
      // Montag) für die Detailseite - einzelne Check-ins bleiben privat.
      place_checkins_this_week: {
        Args: { p_place_id: string };
        Returns: number;
      };

      // lat/lon eines bekannten Ortes, für die Pin-Korrektur bei
      // ZU_WEIT_ENTFERNT im Check-in-Flow (T9).
      place_location: {
        Args: { p_place_id: string };
        Returns: { lat: number; lon: number }[];
      };

      // Pin-Korrektur durch den Ersteller (RLS wie beim direkten Update).
      update_place_location: {
        Args: { p_place_id: string; p_lat: number; p_lon: number };
        Returns: undefined;
      };

      // Kartenabfrage. p_category default 'baustelle', p_radius_m default 5000.
      places_nearby: {
        Args: {
          p_lat: number;
          p_lon: number;
          p_radius_m?: number;
          p_limit?: number;
          p_category?: string;
        };
        Returns: {
          id: string;
          title: string;
          lat: number;
          lon: number;
          distance_m: number;
          status: PlaceStatus;
          source: PlaceSource;
          is_confirmed: boolean;
          checkin_count: number;
          activity: ActivityState;
          fresh_observables: number;
          thumb_path: string | null;
        }[];
      };

      // Ort anlegen inkl. Duplikatschutz (100 m Radius). Wirft u.a.
      // 'NICHT_ANGEMELDET' | 'GESPERRT' | 'MINDESTENS_EIN_MERKMAL' | 'DUPLIKAT:<uuid>'.
      create_place: {
        Args: {
          p_title: string;
          p_lat: number;
          p_lon: number;
          p_observable_ids: string[];
          p_address?: string | null;
          p_note?: string | null;
          p_attributes?: Json;
          p_category?: string;
        };
        Returns: string; // uuid des neuen Orts
      };

      // Check-in inkl. Geofence (<=200 m), Positiv-/Negativsignalen und
      // Sammelalbum-Freischaltungen. Wirft u.a. 'NICHT_ANGEMELDET' |
      // 'GESPERRT' | 'ORT_NICHT_GEFUNDEN' | 'ZU_WEIT_ENTFERNT:<m>' | 'GPS_UNGENAU'.
      do_checkin: {
        Args: {
          p_place_id: string;
          p_lat: number;
          p_lon: number;
          p_accuracy_m?: number | null;
          p_observable_ids?: string[];
        };
        Returns: {
          checkin_id: string;
          counted: boolean;
          distance_m: number;
          new_unlocks: string[];
        };
      };
    };
  };
};

// --- Bequeme Kurzformen für Aufrufstellen -------------------------------

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
export type Views<T extends keyof Database["public"]["Views"]> =
  Database["public"]["Views"][T]["Row"];

export type PlaceCategory = Tables<"place_categories">;
export type Profile = Tables<"profiles">;
export type Place = Tables<"places">;
export type PlaceHours = Tables<"place_hours">;
export type PlaceActivity = Tables<"place_activity">;
export type ObservableType = Tables<"observable_types">;
export type PlaceObservable = Tables<"place_observables">;
export type Checkin = Tables<"checkins">;
export type CheckinObservable = Tables<"checkin_observables">;
export type UserObservableUnlock = Tables<"user_observable_unlocks">;
export type PlacePhoto = Tables<"place_photos">;
export type Report = Tables<"reports">;
export type Holiday = Tables<"holidays">;
export type PlaceObservableView = Views<"v_place_observables">;
export type PlaceNearby =
  Database["public"]["Functions"]["places_nearby"]["Returns"][number];
