<template>
  <v-form
    ref="form"
    v-model="valid">

    <v-text-field
      prepend-icon="face"
      v-model="user.cn"
      :rules="[v => /^[A-Za-z0-9 äüöÄÜÖß]{2,}[A-Za-z0-9äüöÄÜÖß]+$/.test(v) || 'mindestens 3 Zeichen, keine Sonderzeichen']"
      :error-messages="errors.cn"
      @change="checkCnAvailability"
      @input="updateUid"
      required
      hint="mindestens 3 Zeichen, keine Sonderzeichen"
      label="Anzeigename">
    </v-text-field>
    <v-text-field
      prepend-icon="person"
      :disabled="action ==='editProfile'"
      v-model="user.uid"
      :rules="[v => /^[A-Za-z0-9_]{2,}[A-Za-z0-9]+$/.test(v) || 'mindestens 3 Zeichen, keine Sonderzeichen, keine Umlaute, keine Leerzeichen']"
      :error-messages="errors.uid"
      @change="checkUidAvailability"
      label="User ID">
    </v-text-field>
    <v-select
      :items="user.memberGroups"
      item-text="o"
      item-value="dn"
      prepend-icon="night_shelter"
      v-model="user.ou"
      label="Zugehörigkeit">
    </v-select>
    <v-text-field
      prepend-icon="home"
      v-model="user.l"
      :rules="[ v=> !!v || 'bitte den Ort deines Projekts angeben' ]"
      label="Ort"
      required>
    </v-text-field>
    <v-text-field
      prepend-icon="email"
      :disabled="action ==='editProfile'"
      :rules="[v => /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(v) || 'keine gültige E-Mailadresse' ]"
      :error-messages="errors.mail"
      @change="checkMailAvailability"
      v-model="user.mail"
      label="E-Mail">
    </v-text-field>
    <v-select
      :items="languages"
      prepend-icon="language"
      v-model="user.preferredLanguage"
      label="Sprache"
      required>
    </v-select>
    <v-text-field
      prepend-icon="upload"
      :disabled="action ==='editProfile'"
      v-model="user.description"
      label="Speicherplatz"
      required>
    </v-text-field>
    <PasswordFields />
    <v-combobox
      prepend-icon="groups"
      v-if="showGroups"
      v-model="member"
      item-text="o"
      item-value="dn"
      small-chips
      label="Mitglied in"
      multiple
      readonly
      single-line
    />
    <v-combobox
      prepend-icon="edit"
      v-if="showGroups"
      v-model="owner"
      item-text="o"
      item-value="dn"
      small-chips
      label="Admin von"
      multiple
      readonly
      single-line
    />

  </v-form>
</template>

<script>

import axios from 'axios'
import router from '@/router'
import PasswordFields from '@/components/user/PasswordFields'
export default {
  props: ['action', 'user', 'showGroups', 'member', 'owner', 'password'],
  components: { PasswordFields },
  data() {
    return {
      languages: [{text: 'Deutsch', value: 'de'}, {text: 'English', value: 'en'}],
      errors: {
        cn: [],
        uid: [],
        mail: []
      },
      valid: true,
      oldUser: {}
    }
  },
  watch: {
    valid(newValue, oldValue) {
      this.$emit('valid', newValue);
    }
  },
  methods: {
    async checkCnAvailability (cn) {
      this.errors.cn = []
      if (cn !== this.oldUser.cn) {
        try {
          await axios.get('/api/user/available/cn/' + cn)
            .then(response => {
              if(!response.data.available) {
                this.errors.cn.push('Anzeigename ist leider bereits vergeben')
              }
            })
        } catch(error) {}
      }
    },
    async checkUidAvailability (uid) {
      this.errors.uid = []
      if (uid !== this.oldUser.uid) {
        try {
          await axios.get('/api/user/available/uid/' + uid)
            .then(response => {
              if(!response.data.available) {
                this.errors.uid.push('User ID ist leider bereits vergeben')
              }
            })
        } catch(error) {}
      }
    },
    async checkMailAvailability (uid) {
      this.errors.mail = []
      if (uid !== this.oldUser.uid) {
        try {
          await axios.get('/api/user/available/mail/' + uid)
            .then(response => {
              if(!response.data.available) {
                this.errors.mail.push('Diese E-Mailadresse wird bereits von einem anderen Account verwendet')
              }
            })
        } catch(error) {}
      }
    },
    updateUid(newCn) {
      if (this.action === 'createUser') {
        this.user.uid = newCn.toLowerCase()
              .replaceAll('ä', 'ae')
              .replaceAll('ö', 'oe')
              .replaceAll('ü', 'ue')
              .replaceAll('ß', 'ss')
              .replaceAll(' ', '_')
              .replaceAll(/[\W]+/g,"")
              .substr(0,35);
      }
    }
  },
  created() {
    this.oldUser = {... this.user};
  }
}
</script>