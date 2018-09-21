window.addEventListener('load', function main() {

  var auth = firebase.auth()
  var db = firebase.firestore()
  db.settings({ timestampsInSnapshots: true })

  var HomeScene = Vue.component('home-scsne', {
    template: '#home-scene-template',
    data: function(){
      return {
        players: []
      }
    },
    methods: {},
    created: function(){
      this.unsubscribe = db.collection('players').onSnapshot((snapshot)=>{
        var players = []
        snapshot.forEach((doc) =>{
          var data = doc.data()
          players.push({
            displayName: data.display_name,
            amount: data.amount,
            message: data.message,
            position: data.position,
            status: data.status
          })
        })
        this.players = players
      })
    },
    beforeDestroy: function(){
      this.unsubscribe()
    }
  })

  var ActivitiesScene = Vue.component('activities-scene', {
    template: '#activities-scene-template',
    data: function(){
      return {
        activities: []
      }
    },
    methods: {},
    created: function(){
      db.collection('activities').orderBy("timestamp", "desc").get().then((snapshot) =>{
        var activities = []
        console.log(snapshot.docs)
        snapshot.docs.forEach((doc)=>{
          console.log(doc)
          var data = doc.data()
          var d = new Date(data.tiemstamp)
          var time = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate() + ' ' + d.getHours() + ':' + d.getMinutes()
          activities.push({
            time: time,
            displayName: data.displayName,
            content: data.content
          })
        })
        this.activities = activities
      })
    }
  })

  var MeScene = Vue.component('me-scsne', {
    template: '#me-scene-template',
    data: function(){
      return {
        isAuthorized: true,
        mode: 'none',
        error: null,

        email: '',
        password: '',

        displayName: '',
        amount: '',
        status: '',
        position: '',
        message: '',

        updateState: 'ready',

        docId: null,
        unsubscribe: null,
      }
    },
    watch: {
      mode: function(val){
        if (this.mode === 'none') {
          this.displayName = ''
          this.email = ''
          this.password = ''
          this.error = null
        }
      }
    },
    methods: {
      signup: function(){
        var email = this.email,
            password = this.password,
            displayName = this.displayName
        this.mode = 'progress'
        auth.createUserWithEmailAndPassword(email, password)
          .then((result) => {
            var player = {
              author_id: result.user.uid,
              display_name: displayName,
              amount: 10000,
              message: '準備はできた',
              status: 'laugh',
              position: 'none'
            }
            return db.collection('players').add(player)
          })
          .then(() => {
            this.mode = 'none'
            this.$router.replace('/home')
          })
          .catch((error) => {
            this.mode = 'signup'
            this.error = error
          })
      },
      signin: function(){
        this.mode = 'progress'
        var email = this.email,
            password = this.password
        auth.signInWithEmailAndPassword(email, password)
          .then(()=>{
            this.mode = 'none'
            this.$router.replace('/home')
          })
          .catch((error)=> {
            this.mode = 'signin'
            this.error = error
          })
      },
      signout: function(){
        auth.signOut().then(() => {
          this.docId = null
          this.mode = 'none'
          this.$router.replace('/home')
          if(this.unsubscribe) {
            this.unsubscribe()
            this.unsubscribe = null
          }
        })
      },
      update: function(){

        this.updateState = 'progress'

        var uid = auth.currentUser.uid,
            docId = this.docId,
            displayName = this.displayName,
            amount = this.amount,
            status = this.status,
            message = this.message,
            position = this.position

        db.collection('players').doc(docId).set({
          author_id: uid,
          display_name: displayName,
          amount: amount,
          status: status,
          message: message,
          position: position,
        }, { merge: true }).then(() =>{
          this.updateState = 'ready'
        }).catch((error) => {
          this.updateState = 'ready'
          this.error = error
        })

        var content = ""

        if (this.amount != this.beforeAmount) content += "資産が" + this.amount + "になりました。\n"
        if (this.position != this.beforePosition) {
          if (this.position === "long") content += "ロングにポジションを取りました。\n"
          if (this.position === "short") content += "ショートにポジションを取りました。\n"
          if (this.position === "none") content += "ノーポジになりました。\n"
        }
        if (this.message != this.beforeMessage) content += this.message + "\n"

        if (content) {
          db.collection('activities').add({
            author_id: uid,
            displayName: displayName,
            timestamp: new Date().getTime(),
            content: content
          })
        }
      },
      subscribe: function(uid){
        if (!uid) return

        if (this.unsubscribe) this.unsubscribe()

        this.unsubscribe = db.collection('players').where('author_id', '==', uid).onSnapshot((snapshot)=>{
          var player = null, docId = null

          snapshot.forEach((doc) => {
            docId = doc.id
            player = doc.data()
          })

          this.docId = docId
          this.displayName = player.display_name

          this.amount = player.amount
          this.beforeAmount = player.amount
          this.position = player.position
          this.beforePosition = player.position
          this.message = player.message
          this.beforeMessage = player.message
          this.status = player.status
        })
      }
    },
    created: function(){
      if (auth.currentUser) {
        this.isAuthorized = true
        this.subscribe(auth.currentUser.uid)
      } else {
        this.isAuthorized = false
      }
    },
    beforeDestroy: function(){
      if (this.unsubscribe) this.unsubscribe()
    }
  })

  var router = new VueRouter({
    mode: 'history',
    routes: [
      { path: '/home', component: HomeScene },
      { path: '/activities', component: ActivitiesScene },
      { path: '/me', component: MeScene },
      { path: '*', redirect: '/home' }
    ]
  })

  new Vue({
    router: router,
    data: {
      isLoaded: false,
      user: null,
    },
    computed: {},
    methods: {},
    created: function(){
      auth.onAuthStateChanged((user)=>{
        this.user = user
        this.isLoaded = true
      })
    }
  }).$mount('#app')

})
